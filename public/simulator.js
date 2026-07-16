// EN: DOM Elements / PT: Elementos do DOM
const canvas = document.getElementById('simulator-canvas');
const spinSlider = document.getElementById('spin-slider');
const spinValue = document.getElementById('spin-value');
const incSlider = document.getElementById('inc-slider');
const incValue = document.getElementById('inc-value');
const distSlider = document.getElementById('dist-slider');
const distValue = document.getElementById('dist-value');
const tempSlider = document.getElementById('temp-slider');
const tempValue = document.getElementById('temp-value');
const outerSlider = document.getElementById('outer-slider');
const outerValue = document.getElementById('outer-value');
const stepSlider = document.getElementById('step-slider');
const stepValue = document.getElementById('step-value');
const iterSlider = document.getElementById('iter-slider');
const iterValue = document.getElementById('iter-value');
const blurSlider = document.getElementById('blur-slider'); // EN: Lens blur slider / PT: Slider de desfoque de lente
const blurValue = document.getElementById('blur-value'); // EN: Displayed blur value / PT: Valor exibido do desfoque

const toggleLensing = document.getElementById('toggle-lensing');
const toggleBeaming = document.getElementById('toggle-beaming');
const toggleRedshift = document.getElementById('toggle-redshift');
const toggleDragging = document.getElementById('toggle-dragging');
const togglePhotonSphere = document.getElementById('toggle-photon-sphere'); // EN: Photon sphere control / PT: Controle para a esfera de fótons
const toggleAA = document.getElementById('toggle-aa'); // EN: SSAA 2x antialiasing control / PT: Controle para antialiasing SSAA 2x

const toggleTheoryBtn = document.getElementById('toggle-theory-btn');
const closeTheoryBtn = document.getElementById('close-theory-btn');
const theoryModal = document.getElementById('theory-modal');

// EN: Camera State / PT: Estado da Câmera
let camDistance = parseFloat(distSlider.value);
let camInclinationDeg = parseInt(incSlider.value); // EN: 0 = equatorial, 90 = polar / PT: 0 = equatorial, 90 = polar
let camAzimuth = 0.0;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// EN: Theory Modal Toggle / PT: Teoria Modal Toggle
toggleTheoryBtn.addEventListener('click', () => theoryModal.classList.remove('hidden'));
closeTheoryBtn.addEventListener('click', () => theoryModal.classList.add('hidden'));

// EN: UI Value Update & ISCO Calculation / PT: Atualização de Valores na UI & Cálculo de ISCO
function calculateISCO(a) {
    // EN: Bardeen et al. (1972) equations for prograde ISCO radius
    // PT: Equações de Bardeen et al. (1972) para o raio ISCO de órbita prograde
    // M = 1.0
    const x1 = 1.0 + Math.pow(1.0 - a * a, 1/3) * (Math.pow(1.0 + a, 1/3) + Math.pow(1.0 - a, 1/3));
    const x2 = Math.sqrt(3.0 * a * a + x1 * x1);
    const r_isco = 3.0 + x2 - Math.sqrt((3.0 - x1) * (3.0 + x1 + 2.0 * x2));
    return r_isco;
}

function updateUI() {
    spinValue.textContent = parseFloat(spinSlider.value).toFixed(2);
    incValue.textContent = incSlider.value + '°';
    distValue.textContent = parseFloat(distSlider.value).toFixed(1) + 'M';
    tempValue.textContent = tempSlider.value + 'K';
    outerValue.textContent = parseFloat(outerSlider.value).toFixed(1) + 'M';
    stepValue.textContent = parseFloat(stepSlider.value).toFixed(2);
    iterValue.textContent = iterSlider.value;
    blurValue.textContent = parseFloat(blurSlider.value).toFixed(1) + 'px';
    
    // EN: Applies Gaussian blur to the canvas rendering viewport
    // PT: Aplica o borrão Gaussian na viewport de renderização do canvas
    canvas.style.filter = `blur(${blurSlider.value}px)`;
}

// EN: Slider Event Listeners / PT: Event Listeners dos Sliders
[spinSlider, incSlider, distSlider, tempSlider, outerSlider, stepSlider, blurSlider, iterSlider].forEach(slider => {
    slider.addEventListener('input', () => {
        updateUI();
        camDistance = parseFloat(distSlider.value);
        camInclinationDeg = parseInt(incSlider.value);
    });
});

// EN: Mouse Interaction for Camera Rotation / PT: Interação com o Mouse para Rotacionar a Câmera
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;
    
    // EN: Rotation sensitivity / PT: Sensibilidade de rotação
    camAzimuth -= deltaX * 0.007;
    // EN: Limits inclination to not exceed poles (-89 to 89)
    // PT: Limita a inclinação para não ultrapassar os polos (-89 a 89)
    camInclinationDeg = Math.max(-89, Math.min(89, camInclinationDeg - deltaY * 0.2));
    
    incSlider.value = Math.round(camInclinationDeg);
    updateUI();
    
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

// EN: Touch Support (Phones and Tablets) / PT: Suporte para Touch (Celulares e Tablets)
canvas.addEventListener('touchstart', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
});

window.addEventListener('touchend', () => {
    isDragging = false;
});

canvas.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.touches[0].clientX - previousMousePosition.x;
    const deltaY = e.touches[0].clientY - previousMousePosition.y;
    
    camAzimuth -= deltaX * 0.007;
    camInclinationDeg = Math.max(-89, Math.min(89, camInclinationDeg - deltaY * 0.2));
    
    incSlider.value = Math.round(camInclinationDeg);
    updateUI();
    
    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
});

// EN: --- WebGL Configuration --- / PT: --- Configuração do WebGL ---
const gl = canvas.getContext('webgl');
if (!gl) {
    alert('Desculpe, seu navegador não suporta WebGL.');
}

// EN: Vertex Shader (Fills screen with a 2-triangle Quad) / PT: Vertex Shader (Preenche a tela com um Quad de 2 triângulos)
const vsSource = `
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

// EN: Fragment Shader (Black Hole Ray Tracer with Kerr Geometry) / PT: Fragment Shader (Ray Tracer de Buraco Negro com Geometria de Kerr)
const fsSource = `
    #ifdef GL_ES
    precision highp float;
    #endif

    uniform vec2 u_resolution;
    uniform vec3 u_camPos;
    uniform vec3 u_camDir;
    uniform vec3 u_camRight;
    uniform vec3 u_camUp;
    
    // EN: Physical Parameters / PT: Parâmetros Físicos
    uniform float u_spin;          // EN: Spin parameter 'a' (0.0 = Schwarzschild, 0.99 = Kerr) / PT: Parâmetro de spin 'a'
    uniform float u_temp;          // EN: Peak temperature of accretion disk / PT: Temperatura de pico do disco de acreção
    uniform float u_outerRadius;   // EN: Outer radius of accretion disk / PT: Raio externo do disco de acreção
    uniform float u_isco;          // EN: ISCO radius dynamically calculated in JS / PT: Raio ISCO calculado dinamicamente no JS
    uniform float u_dt;            // EN: Temporal integration step (resolution) / PT: Passo de integração temporal (resolução)
    uniform float u_time;          // EN: Elapsed time (used for animations) / PT: Tempo decorrido (usado para animações)
    
    // EN: Active physics toggles / PT: Toggles de física ativa
    uniform bool u_lensing;
    uniform bool u_beaming;
    uniform bool u_redshift;
    uniform bool u_dragging;
    uniform bool u_showPhotonSphere; // EN: Visual toggle for photon sphere / PT: Toggle visual para a esfera de fótons
    uniform bool u_enableAA; // EN: Toggle to enable supersampling AA / PT: Toggle para ativar suavização supersampling
    uniform int u_max_iters; // EN: Raymarching iteration limit / PT: Limite de iterações do raymarching

    // EN: Noise function for procedural stars and nebulas / PT: Função de ruído para estrelas e nebulosas procedurais
    float hash(vec3 p) {
        p = fract(p * vec3(443.8975, 397.2973, 491.1871));
        p += dot(p.xyz, p.yzx + 19.19);
        return fract(p.x * p.y * p.z);
    }

    float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        vec3 u = f * f * (3.0 - 2.0 * f);

        return mix(
            mix(
                mix(hash(i + vec3(0.0,0.0,0.0)), hash(i + vec3(1.0,0.0,0.0)), u.x),
                mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), u.x), 
                u.y
            ),
            mix(
                mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), u.x),
                mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), u.x), 
                u.y
            ), 
            u.z
        );
    }

    // EN: High fidelity procedural starfield / PT: Campo estelar procedural de alta fidelidade
    vec3 getStarfield(vec3 rd) {
        vec3 color = vec3(0.0);
        
        // EN: Milky Way Nebula (Galactic Band) in background / PT: Nebulosa da Via Láctea (Banda Galáctica) no fundo
        float band = smoothstep(0.3, 0.0, abs(rd.z + 0.1 * sin(rd.x * 2.0 + rd.y * 1.5)));
        float neb = noise(rd * 3.5) * 0.5 + noise(rd * 7.0) * 0.25;
        // EN: Realistic and subtle deep space colors (Avoids purple/magenta background)
        // PT: Cores realistas e sutis do espaço profundo (Evita o fundo roxo/magenta)
        vec3 nebulaCol = mix(vec3(0.005, 0.01, 0.02), vec3(0.03, 0.015, 0.005), noise(rd * 2.0 + 1.0));
        color += nebulaCol * band * (0.5 + neb);
        
        // EN: Sharp point stars based on spectral type temperature / PT: Estrelas pontuais nítidas baseadas na temperatura do tipo espectral
        for (int i = 0; i < 3; i++) {
            float scale = 90.0 + float(i) * 55.0;
            vec3 p = rd * scale;
            vec3 ip = floor(p);
            vec3 fp = fract(p);
            
            float h = hash(ip);
            if (h > 0.985 - float(i) * 0.004) {
                vec3 offset = vec3(hash(ip + 1.0), hash(ip + 2.0), hash(ip + 3.0));
                vec3 delta = fp - offset;
                float d = length(delta);
                float size = 0.035 + 0.055 * hash(ip + 4.0);
                float intensity = exp(-d / size) * (0.25 + 0.75 * hash(ip + 5.0));
                
                // EN: Stellar color classification / PT: Classificação estelar de cor
                vec3 starCol = mix(vec3(1.0, 0.78, 0.62), vec3(0.68, 0.86, 1.0), hash(ip + 6.0));
                color += starCol * intensity * 1.6;
            }
        }
        return color;
    }

    // EN: Tanner-Helland Algorithm for real blackbody temperature (1000K to 40000K)
    // PT: Algoritmo Tanner-Helland para temperatura de corpo negro real (1000K a 40000K)
    // Ref: http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/
    // EN: Temp input must be in Kelvin. Algorithm operates in Temp/100.
    // PT: A entrada Temp deve estar em Kelvin. O algoritmo opera em Temp/100.
    vec3 blackbody(float Temp) {
        float t = clamp(Temp / 100.0, 10.0, 400.0); // EN: Scales to hundreds of Kelvin / PT: Escala para centenas de Kelvin
        float r, g, b;
        
        // Red
        if (t <= 66.0) {
            r = 255.0;
        } else {
            r = 329.698727446 * pow(t - 60.0, -0.1332047592);
        }
        
        // Green
        if (t <= 66.0) {
            g = 99.4708025861 * log(t) - 161.1195681661;
        } else {
            g = 288.1221695283 * pow(t - 60.0, -0.0755148492);
        }
        
        // Blue
        if (t >= 66.0) {
            b = 255.0;
        } else if (t <= 19.0) {
            b = 0.0;
        } else {
            b = 138.5177312231 * log(t - 10.0) - 305.0447927307;
        }
        
        return vec3(clamp(r / 255.0, 0.0, 1.0), clamp(g / 255.0, 0.0, 1.0), clamp(b / 255.0, 0.0, 1.0));
    }

    // EN: Calculates metric tensor derivatives analytically based on the Kerr-Schild formulation
    // PT: Calcula as derivadas do tensor métrico analiticamente baseado na formulação de Kerr-Schild
    void getKS_Derivatives(vec3 pos, float M, float a, out float r, out float Sigma, out float f, out vec3 df, out mat3 dl) {
        float R2 = dot(pos, pos);
        float a2 = a * a;
        float b = R2 - a2;
        float disc = sqrt(b * b + 4.0 * a2 * pos.z * pos.z);
        float r2 = 0.5 * (b + disc);
        r = sqrt(max(0.001, r2));
        
        Sigma = r2 + a2 * pos.z * pos.z / r2;
        f = 2.0 * M * r / Sigma;
        
        // EN: Gradient of r / PT: Gradiente de r
        vec3 grad_r = vec3(pos.x * r, pos.y * r, pos.z * (r + a2 / r)) / Sigma;
        
        // EN: Gradient of Sigma / PT: Gradiente de Sigma
        float dSigma_dr = 2.0 * r - 2.0 * a2 * pos.z * pos.z / (r2 * r);
        vec3 grad_Sigma = dSigma_dr * grad_r;
        grad_Sigma.z += 2.0 * a2 * pos.z / r2;
        
        // EN: Gradient of f / PT: Gradiente de f
        df = 2.0 * M * (Sigma * grad_r - r * grad_Sigma) / (Sigma * Sigma);
        
        // EN: Gradients of l^nu / PT: Gradientes de l^nu
        float r2_a2 = r2 + a2;
        float num1 = r * pos.x + a * pos.y;
        float num2 = r * pos.y - a * pos.x;
        
        vec3 dl1 = (vec3(grad_r.x * pos.x + r, grad_r.y * pos.x + a, grad_r.z * pos.x) - num1 * (2.0 * r * grad_r) / r2_a2) / r2_a2;
        vec3 dl2 = (vec3(grad_r.x * pos.y - a, grad_r.y * pos.y + r, grad_r.z * pos.y) - num2 * (2.0 * r * grad_r) / r2_a2) / r2_a2;
        vec3 dl3 = (vec3(0.0, 0.0, r) - pos.z * grad_r) / r2;
        
        dl = mat3(dl1, dl2, dl3);
    }

    // EN: Hamiltonian equations of motion / PT: Equações de movimento Hamiltonianas
    void getHamiltonianDerivatives(vec3 pos, vec3 mom, float M, float a, out vec3 dx, out vec3 dp) {
        float r, Sigma, f;
        vec3 df;
        mat3 dl;
        getKS_Derivatives(pos, M, a, r, Sigma, f, df, dl);
        
        float r2 = r * r;
        float r2_a2 = r2 + a * a;
        vec3 l = vec3((r * pos.x + a * pos.y) / r2_a2, (r * pos.y - a * pos.x) / r2_a2, pos.z / r);
        
        float V = dot(mom, l) - 1.0;
        dx = mom - f * l * V;
        dp = 0.5 * V * V * df + f * V * (dl * mom);
    }

    // EN: Sheared accretion disk noise (dust filaments) - GPU OPTIMIZED
    // PT: Ruído do disco de acreção cisalhado (filamentos de poeira) - OTIMIZADO PARA GPU
    float getDiskNoise(vec3 p, float Omega_K) {
        float phi = atan(p.y, p.x);
        float r = length(p.xy);
        float phi_sheared = phi - 3.0 * Omega_K * u_time;
        
        float n1 = noise(vec3(r * 2.0, phi_sheared * 6.0, p.z * 5.0));
        float n2 = noise(vec3(r * 4.0, phi_sheared * 12.0, p.z * 10.0 + u_time * 0.2)) * 0.5;
        // EN: 3rd noise octave removed for GPU performance
        // PT: Removida 3ª oitava de ruído para salvar performance pesada na GPU
        
        return (n1 + n2) / 1.5;
    }

    // EN: Render loop for a single pixel (ray integration)
    // PT: Loop de renderização para um único pixel (integração de raio)
    vec3 renderPixel(vec2 uv) {
        float fov = 0.9;
        vec3 rd = normalize(u_camDir + fov * (uv.x * u_camRight + uv.y * u_camUp));
        
        float M = 1.0; // EN: Normalized black hole mass / PT: Massa normalizada do buraco negro
        float a = u_spin;
        
        // EN: Initial photon coordinates at camera / PT: Coordenadas iniciais do fóton na câmera
        vec3 pos = u_camPos;
        
        // EN: Solve H=0 for the initial momentum 'mom' of the camera / PT: Resolver H=0 para o momento inicial 'mom' da câmera
        float r_cam, Sigma_cam, f_cam;
        vec3 df_cam;
        mat3 dl_cam;
        getKS_Derivatives(u_camPos, M, a, r_cam, Sigma_cam, f_cam, df_cam, dl_cam);
        
        float r2_cam = r_cam * r_cam;
        float r2_a2_cam = r2_cam + a * a;
        vec3 l_cam = vec3((r_cam * u_camPos.x + a * u_camPos.y) / r2_a2_cam, (r_cam * u_camPos.y - a * u_camPos.x) / r2_a2_cam, u_camPos.z / r_cam);
        
        float A_cam = dot(rd, l_cam);
        float disc_k = f_cam * f_cam * A_cam * A_cam + (1.0 - f_cam * A_cam * A_cam) * (1.0 + f_cam);
        
        float denom = 1.0 - f_cam * A_cam * A_cam;
        if (abs(denom) < 0.0001) denom = sign(denom) * 0.0001;
        float k = (-f_cam * A_cam + sqrt(max(0.0, disc_k))) / denom;
        vec3 mom = k * rd;
        
        // EN: --- VISUAL IMPROVEMENT: Initial Dithering Noise --- / PT: --- MELHORIA VISUAL: Ruído de Dithering Inicial ---
        // EN: Adds a random initial micro-step to break step "rings" (banding) in the disk volume
        // PT: Adiciona um micro-passo aleatório inicial para quebrar os "anéis" de step (banding) no volume do disco
        float dither = fract(sin(dot(uv.xy, vec2(12.9898, 78.233))) * 43758.5453) * u_dt;
        pos += mom * dither;
        
        vec3 accumCol = vec3(0.0);
        float accumAlpha = 0.0;
        
        // EN: OPTIMIZED RAYMARCHING LOOP. Using UI defined max iterations to avoid GPU melting
        // PT: LOOP DE RAYMARCHING OTIMIZADO. Usa o limite definido na UI para evitar GPU melting
        for (int i = 0; i < 1000; i++) {
            if (i >= u_max_iters) break;
            
            float r, Sigma, f;
            vec3 df;
            mat3 dl;
            getKS_Derivatives(pos, M, a, r, Sigma, f, df, dl);
            
            // EN: End of integration if falls into Kerr event horizon / PT: Fim de integração se cair no horizonte de eventos de Kerr
            float r_h = M + sqrt(max(0.0, M*M - a*a));
            if (r <= r_h + 0.05) { // EN: Increased threshold to avoid moiré at horizon / PT: Threshold aumentado para evitar moiré no horizonte
                accumAlpha = 1.0;
                break;
            }
            
            // EN: Adaptive integration step / PT: Passo de integração adaptativo
            // EN: OPTIMIZATION: Larger step in weak fields, drastically reduced only near horizon (r < 3.5M) to keep RK4 numerical stability.
            // PT: OTIMIZAÇÃO: Passo maior em campos fracos, reduzido drasticamente apenas perto do horizonte (r < 3.5M) para manter a estabilidade numérica do RK4.
            // EN: This prevents the Moiré "black sphere" without causing the disk to vanish at long distances.
            // PT: Isso previne a "esfera preta" de Moiré sem causar o sumiço do disco a longas distâncias.
            float current_dt = u_dt * clamp(r / 1.5, 0.2, 50.0);
            if (r < 3.5 * M) {
                current_dt *= max(0.1, r / (3.5 * M));
            }
            
            vec3 prev_pos = pos;
            vec3 next_pos = pos;
            vec3 next_mom = mom;
            
            if (u_lensing) {
                // EN: RK4 integrator over the Kerr-Schild geodesic / PT: Integrador RK4 sobre a geodésica de Kerr-Schild
                vec3 k1_pos, k1_mom;
                getHamiltonianDerivatives(pos, mom, M, a, k1_pos, k1_mom);
                
                vec3 m2_pos = pos + 0.5 * current_dt * k1_pos;
                vec3 m2_mom = mom + 0.5 * current_dt * k1_mom;
                vec3 k2_pos, k2_mom;
                getHamiltonianDerivatives(m2_pos, m2_mom, M, a, k2_pos, k2_mom);
                
                vec3 m3_pos = pos + 0.5 * current_dt * k2_pos;
                vec3 m3_mom = mom + 0.5 * current_dt * k2_mom;
                vec3 k3_pos, k3_mom;
                getHamiltonianDerivatives(m3_pos, m3_mom, M, a, k3_pos, k3_mom);
                
                vec3 m4_pos = pos + current_dt * k3_pos;
                vec3 m4_mom = mom + current_dt * k3_mom;
                vec3 k4_pos, k4_mom;
                getHamiltonianDerivatives(m4_pos, m4_mom, M, a, k4_pos, k4_mom);
                
                next_pos = pos + (current_dt / 6.0) * (k1_pos + 2.0 * k2_pos + 2.0 * k3_pos + k4_pos);
                next_mom = mom + (current_dt / 6.0) * (k1_mom + 2.0 * k2_mom + 2.0 * k3_mom + k4_mom);
            } else {
                next_pos = pos + current_dt * mom;
                next_mom = mom;
            }
            
            // EN: Visual Guide: Photon Sphere (Fixed at r=3M to form a complete spherical shell)
            // PT: Guia Visual: Esfera de Fótons (Fixo em r=3M para formar uma casca esférica completa)
            if (u_showPhotonSphere) {
                float r_photon = 3.0 * M;
                
                float r_prev = length(prev_pos);
                float r_curr = length(next_pos);
                if ((r_prev - r_photon) * (r_curr - r_photon) < 0.0) {
                    float t_cross = (r_photon - r_prev) / (r_curr - r_prev);
                    vec3 pos_cross = prev_pos + t_cross * (next_pos - prev_pos);
                    
                    float theta = acos(clamp(pos_cross.z / r_photon, -1.0, 1.0));
                    float phi = atan(pos_cross.y, pos_cross.x);
                    
                    float gridTheta = smoothstep(0.96, 1.0, cos(theta * 18.0));
                    float gridPhi = smoothstep(0.96, 1.0, cos(phi * 24.0));
                    float grid = max(gridTheta, gridPhi);
                    
                    vec3 gridCol = vec3(0.0, 0.95, 0.75);
                    accumCol += (1.0 - accumAlpha) * gridCol * grid * 0.75;
                    accumAlpha += (1.0 - accumAlpha) * grid * 0.75;
                }
            }
            
            // EN: Volumetric Accretion Disk / PT: Disco de Acreção Volumétrico
            // EN: Compute the oblate Kerr radius at NEXT position for disk check
            // PT: Computar o raio-Kerr oblato na posição NEXT para o check do disco
            float R2_next = dot(next_pos, next_pos);
            float b_next = R2_next - a * a;
            float r_disk = sqrt(max(0.001, 0.5 * (b_next + sqrt(b_next * b_next + 4.0 * a * a * next_pos.z * next_pos.z))));
            
            // EN: Increased disk bounding box thickness (fade-out is now mathematical)
            // PT: Espessura da bounding box do disco aumentada (O fade-out agora é feito matematicamente)
            float H = 0.8;
            if (abs(next_pos.z) < H && r_disk >= u_isco && r_disk <= u_outerRadius) {
                float g_factor = 1.0;
                float Omega_K = sqrt(M) / (pow(r_disk, 1.5) + a * sqrt(M));
                
                if (u_redshift) {
                    // EN: Kerr metric components in the equatorial plane / PT: Componentes da métrica de Kerr no plano equatorial
                    // EN: Sigma_eq = r^2, Delta = r^2 - 2Mr + a^2 / PT: Sigma_eq = r^2, Delta = r^2 - 2Mr + a^2
                    float g_tt = -(1.0 - 2.0 * M / r_disk);
                    float g_tphi = -2.0 * M * a / r_disk;
                    float g_phiphi = r_disk * r_disk + a * a + 2.0 * M * a * a / r_disk;
                    float num = -(g_tt + 2.0 * Omega_K * g_tphi + Omega_K * Omega_K * g_phiphi);
                    
                    // EN: Base gravitational redshift factor / PT: Fator de redshift gravitacional base
                    g_factor = sqrt(max(0.001, num));
                    
                    if (u_beaming) {
                        // EN: Conserved angular momentum of photon: L_z = x*p_y - y*p_x
                        // PT: Momento angular conservado do fóton: L_z = x*p_y - y*p_x
                        float L_z = next_pos.x * next_mom.y - next_pos.y * next_mom.x;
                        float beam_denom = 1.0 - Omega_K * L_z;
                        // EN: Protection against divergence / PT: Proteção contra divergência
                        beam_denom = sign(beam_denom) * max(abs(beam_denom), 0.2);
                        g_factor = g_factor / beam_denom;
                    }
                    
                    // EN: Redshift correction at camera position (static observer)
                    // PT: Correção de redshift na posição da câmera (observador estático)
                    g_factor = g_factor / sqrt(max(0.01, 1.0 - f_cam));
                    
                    // EN: Limit total redshift factor to physically reasonable values
                    // PT: Limitar o fator de redshift total a valores fisicamente razoáveis
                    g_factor = clamp(g_factor, 0.15, 3.0);
                }
                
                // EN: Novikov-Thorne temperature profile T(r) / PT: Perfil de temperatura Novikov-Thorne T(r)
                // EN: Max temperature near ISCO, decays radially / PT: Temperatura máxima perto do ISCO, decai radialmente
                float rr = r_disk / max(0.1, u_isco);
                float T_profile = pow(1.0 / rr, 0.75) * pow(max(0.001, 1.0 - sqrt(1.0 / rr)), 0.25);
                float T = u_temp * T_profile * 2.5;
                float T_obs = abs(g_factor) * T;
                
                // EN: Blackbody color based on observed temperature / PT: Cor de corpo negro baseada na temperatura observada
                vec3 col = blackbody(T_obs);
                
                // EN: Brightness scales as (T_obs/T_ref)^4 — Stefan-Boltzmann Law / PT: Brilho escala como (T_obs/T_ref)^4 — Lei de Stefan-Boltzmann
                float brightness = pow(clamp(T_obs / 4500.0, 0.0, 5.0), 4.0) * 0.5;
                
                // EN: Narrow Gaussian vertical decay (concentrates emission in midplane)
                // PT: Decaimento vertical gaussiano estreito (concentra a emissão no plano médio)
                float vertical_decay = exp(-(next_pos.z * next_pos.z) / 0.06);
                // EN: Smooth radial decay / PT: Decaimento radial suave
                float radial_decay = exp(-0.15 * (r_disk - u_isco));
                float density = radial_decay * vertical_decay;
                
                // EN: Turbulence with Keplerian shear / PT: Turbulência com cisalhamento Kepleriano
                float pattern = 0.4 + 0.6 * getDiskNoise(next_pos, Omega_K);
                density *= pattern;
                
                // EN: CORRECT VOLUMETRIC INTEGRATION (Absorption and Emission)
                // PT: INTEGRAÇÃO VOLUMÉTRICA CORRETA (Absorção e Emissão)
                // EN: Avoids "opaque CD-ROM" effect by accumulating opacity exponentially and slowly
                // PT: Evita o efeito "CD-ROM opaco" ao acumular opacidade exponencialmente e lentamente
                float opacity_coef = 3.5;
                float step_alpha = 1.0 - exp(-density * current_dt * opacity_coef);
                vec3 step_emission = col * brightness * density * current_dt * 12.0;
                
                accumCol += (1.0 - accumAlpha) * step_emission;
                accumAlpha += (1.0 - accumAlpha) * step_alpha;
                
                if (accumAlpha > 0.98) {
                    break;
                }
            }
            
            pos = next_pos;
            mom = next_mom;
            
            float escapeRadius2 = max(900.0, 2.0 * dot(u_camPos, u_camPos));
            if (dot(pos, pos) > escapeRadius2) {
                break;
            }
        }
        
        if (accumAlpha < 1.0) {
            vec3 bgCol = getStarfield(normalize(mom));
            accumCol += (1.0 - accumAlpha) * bgCol;
        }
        
        return accumCol;
    }

    void main() {
        vec3 finalCol = vec3(0.0);
        
        if (u_enableAA) {
            // EN: Supersampling Antialiasing (SSAA 2x - 4 samples per pixel) / PT: Supersampling Antialiasing (SSAA 2x - 4 amostras por pixel)
            vec2 offsets[4];
            offsets[0] = vec2(-0.25, -0.25);
            offsets[1] = vec2(0.25, -0.25);
            offsets[2] = vec2(-0.25, 0.25);
            offsets[3] = vec2(0.25, 0.25);
            
            for (int s = 0; s < 4; s++) {
                vec2 uv = (gl_FragCoord.xy + offsets[s] - 0.5 * u_resolution.xy) / u_resolution.y;
                finalCol += renderPixel(uv);
            }
            finalCol *= 0.25;
        } else {
            // EN: Standard single sampling / PT: Amostragem única padrão
            vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
            finalCol = renderPixel(uv);
        }
        
        // EN: Exposure tonemapping and Gamma correction / PT: Tonemapping de exposição e correção Gamma
        finalCol = finalCol / (finalCol + vec3(1.0)); // EN: Reinhard HDR / PT: Reinhard HDR
        finalCol = pow(finalCol, vec3(1.0 / 2.2));     // EN: Gamma correction / PT: Correção de gama
        
        gl_FragColor = vec4(finalCol, 1.0);
    }
`;

// EN: Utility function to compile shaders / PT: Função utilitária para compilar shaders
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
        console.error('Erro ao compilar shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// EN: Initialize Shader Program / PT: Inicializa o Programa de Shaders
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Erro ao linkar programa de shaders:', gl.getProgramInfoLog(program));
}

// EN: Configures the geometric buffer (a quad covering the entire screen) / PT: Configura o buffer geométrico (um quadrado que cobre a tela inteira)
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = new Float32Array([
    -1.0, -1.0,
     1.0, -1.0,
    -1.0,  1.0,
    -1.0,  1.0,
     1.0, -1.0,
     1.0,  1.0,
]);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

// EN: Locates uniform variables / PT: Localiza as variáveis uniformes
const positionAttributeLocation = gl.getAttribLocation(program, 'position');
const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
const camPosLocation = gl.getUniformLocation(program, 'u_camPos');
const camDirLocation = gl.getUniformLocation(program, 'u_camDir');
const camRightLocation = gl.getUniformLocation(program, 'u_camRight');
const camUpLocation = gl.getUniformLocation(program, 'u_camUp');

const spinLocation = gl.getUniformLocation(program, 'u_spin');
const tempLocation = gl.getUniformLocation(program, 'u_temp');
const outerRadiusLocation = gl.getUniformLocation(program, 'u_outerRadius');
const iscoLocation = gl.getUniformLocation(program, 'u_isco');
const dtLocation = gl.getUniformLocation(program, 'u_dt');
const timeLocation = gl.getUniformLocation(program, 'u_time'); // EN: Time variable binding / PT: Binding da variável de tempo
const iterLocation = gl.getUniformLocation(program, 'u_max_iters');

const lensingLocation = gl.getUniformLocation(program, 'u_lensing');
const beamingLocation = gl.getUniformLocation(program, 'u_beaming');
const redshiftLocation = gl.getUniformLocation(program, 'u_redshift');
const draggingLocation = gl.getUniformLocation(program, 'u_dragging');
const photonSphereLocation = gl.getUniformLocation(program, 'u_showPhotonSphere'); // EN: Photon sphere toggle binding / PT: Binding do toggle da esfera de fótons
const aaLocation = gl.getUniformLocation(program, 'u_enableAA'); // EN: Antialiasing toggle binding / PT: Binding do toggle de antialiasing

// EN: Canvas resize function / PT: Função de redimensionamento do Canvas
function resizeCanvas() {
    let displayWidth = window.innerWidth;
    let displayHeight = window.innerHeight;
    
    // EN: GPU PROTECTION OPTIMIZATION: Clamp total rendering resolution (max ~1080p equivalent area)
    // PT: OTIMIZAÇÃO PARA PROTEÇÃO DE GPU: Clampar resolução total de rendering (max ~1080p equivalente area)
    // EN: This prevents 4K monitors from frying the graphics card when running per-pixel RK4
    // PT: Isso evita que monitores 4K fritem a placa de vídeo ao rodar RK4 por pixel
    const MAX_PIXELS = 1920 * 1080;
    const currentPixels = displayWidth * displayHeight;
    
    if (currentPixels > MAX_PIXELS) {
        const scale = Math.sqrt(MAX_PIXELS / currentPixels);
        displayWidth = Math.floor(displayWidth * scale);
        displayHeight = Math.floor(displayHeight * scale);
    }
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// EN: Start date for dynamic time control / PT: Data de início para controle de tempo dinâmico
const startTime = Date.now();

// EN: Main Render Loop / PT: Loop de Renderização Principal
function render() {
    resizeCanvas();
    
    // EN: Clears the screen / PT: Limpa a tela
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(program);
    
    // EN: Enables quad position attribute / PT: Ativa atributo de posição do quad
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    
    // EN: --- Camera Calculations --- / PT: --- Cálculos da Câmera ---
    // EN: Converts inclination and distance sliders to 3D Cartesian positions / PT: Converte os sliders de inclinação e distância em posições 3D cartesianas
    const inclinationRad = (90 - camInclinationDeg) * Math.PI / 180.0;
    
    const camX = camDistance * Math.sin(inclinationRad) * Math.cos(camAzimuth);
    const camY = camDistance * Math.sin(inclinationRad) * Math.sin(camAzimuth);
    const camZ = camDistance * Math.cos(inclinationRad);
    
    const camPos = [camX, camY, camZ];
    
    // EN: Camera direction vector (looking at origin [0, 0, 0]) / PT: Vetor de direção da câmera (olhando para a origem [0, 0, 0])
    let camDir = [-camX, -camY, -camZ];
    const dirLen = Math.sqrt(camDir[0]*camDir[0] + camDir[1]*camDir[1] + camDir[2]*camDir[2]);
    camDir = [camDir[0]/dirLen, camDir[1]/dirLen, camDir[2]/dirLen];
    
    // EN: Up vector reference to avoid gimbal lock at poles / PT: Referência do vetor Up para evitar gimbal lock nos polos
    let upRef = [0, 0, 1];
    if (Math.abs(camDir[2]) > 0.99) {
        // EN: If camera is almost parallel to Z axis, uses Y axis as temporary reference
        // PT: Se a câmera estiver quase paralela ao eixo Z, usa o eixo Y como referência temporária
        upRef = [0, 1, 0];
    }
    
    // camRight = cross(upRef, camDir)
    let rx = upRef[1] * camDir[2] - upRef[2] * camDir[1];
    let ry = upRef[2] * camDir[0] - upRef[0] * camDir[2];
    let rz = upRef[0] * camDir[1] - upRef[1] * camDir[0];
    const rLen = Math.sqrt(rx*rx + ry*ry + rz*rz);
    const camRight = [rx / rLen, ry / rLen, rz / rLen];
    
    // EN: Camera Up vector (cross product of camRight and camDir) / PT: Vetor Up da câmera (cross product de camRight e camDir)
    const ux = camRight[1] * camDir[2] - camRight[2] * camDir[1];
    const uy = camRight[2] * camDir[0] - camRight[0] * camDir[2];
    const uz = camRight[0] * camDir[1] - camRight[1] * camDir[0];
    const camUp = [ux, uy, uz];
    
    // EN: --- Sending Uniform Variables to Shader --- / PT: --- Envio de Variáveis Uniformes para o Shader ---
    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform3fv(camPosLocation, camPos);
    gl.uniform3fv(camDirLocation, camDir);
    gl.uniform3fv(camRightLocation, camRight);
    gl.uniform3fv(camUpLocation, camUp);
    
    // EN: Black Hole Parameters / PT: Parâmetros do Buraco Negro
    const spin = parseFloat(spinSlider.value);
    gl.uniform1f(spinLocation, spin);
    gl.uniform1f(tempLocation, parseFloat(tempSlider.value));
    gl.uniform1f(outerRadiusLocation, parseFloat(outerSlider.value));
    
    // EN: ISCO radius dynamically calculated based on Spin 'a' / PT: Raio ISCO calculado dinamicamente com base no Spin 'a'
    const isco = calculateISCO(spin);
    gl.uniform1f(iscoLocation, isco);
    gl.uniform1f(dtLocation, parseFloat(stepSlider.value));
    
    // EN: Send raymarching iteration limit from UI / PT: Envia o limite de iterações da UI
    const maxIters = parseInt(document.getElementById('iter-slider').value) || 150;
    gl.uniform1i(iterLocation, maxIters);
    
    // EN: Passes elapsed time to animate the accretion disk fluidly / PT: Passa o tempo decorrido para animar o disco de acreção de forma fluida
    const time = (Date.now() - startTime) / 1000.0;
    gl.uniform1f(timeLocation, time);
    
    // EN: Physics Toggles / PT: Toggles Físicos
    gl.uniform1i(lensingLocation, toggleLensing.checked);
    gl.uniform1i(beamingLocation, toggleBeaming.checked);
    gl.uniform1i(redshiftLocation, toggleRedshift.checked);
    gl.uniform1i(draggingLocation, toggleDragging.checked);
    gl.uniform1i(photonSphereLocation, togglePhotonSphere.checked);
    gl.uniform1i(aaLocation, toggleAA.checked);
    
    // EN: Draws the quad covering the entire viewport (pixel-by-pixel rendering) / PT: Desenha o quadrado cobrindo toda a viewport (renderização pixel-a-pixel)
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    // EN: Requests next frame / PT: Requisita o próximo frame
    requestAnimationFrame(render);
}

// EN: Initializes UI and starts animation / PT: Inicializa UI e começa a animação
updateUI();
requestAnimationFrame(render);
