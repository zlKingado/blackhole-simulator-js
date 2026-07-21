// =============================================================================
//  BLACK HOLE RAY TRACER - KERR METRIC (KERR-SCHILD COORDINATES)
// =============================================================================
//  EN: Relativistic Ray Tracer simulating photon geodesics near a rotating
//      Kerr Black Hole in real-time WebGL. Merges high visual fidelity with
//      rigorous general relativistic physics and Hamiltonian mechanics.
//
//  PT: Ray Tracer relativístico simulando geodésicas de fótons próximo a um
//      Buraco Negro de Kerr em rotação via WebGL em tempo real. Une alta fidelidade
//      visual com física rigorosa de relatividade geral e mecânica hamiltoniana.
//
//  ACADEMIC REFERENCES / REFERÊNCIAS ACADÊMICAS:
//  [1] Bardeen, Press & Teukolsky (1972) - ISCO and orbits in Kerr
//  [2] Chan, Medeiros & Ozel (2018) - GRay2: geodesic integrator in KS coordinates
//  [3] Bacchini, Ripperda & Chen (2018) - Conservative Hamiltonian formulation
//  [4] Teo (2003/2021) - Spherical photon orbits in Kerr spacetime
//  [5] Novikov & Thorne (1973) - Thin disk thermodynamic temperature profile
//  [6] Campitiello, Ghisellini & Sbarrato (2018) - Relativistic g-factor in Kerr disks
// =============================================================================

// -----------------------------------------------------------------------------
//  DOM ELEMENTS / ELEMENTOS DO DOM (INTERFACE DE USUÁRIO)
// -----------------------------------------------------------------------------
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
const blurSlider = document.getElementById('blur-slider');
const blurValue = document.getElementById('blur-value');

// EN: Toggle checkboxes for physical features / PT: Toggles de controle dos efeitos físicos
const toggleLensing = document.getElementById('toggle-lensing');
const toggleBeaming = document.getElementById('toggle-beaming');
const toggleRedshift = document.getElementById('toggle-redshift');
const toggleDragging = document.getElementById('toggle-dragging');
const togglePhotonSphere = document.getElementById('toggle-photon-sphere');
const toggleAA = document.getElementById('toggle-aa');

// EN: Theoretical documentation modal elements / PT: Elementos do modal de documentação teórica
const toggleTheoryBtn = document.getElementById('toggle-theory-btn');
const closeTheoryBtn = document.getElementById('close-theory-btn');
const theoryModal = document.getElementById('theory-modal');

// -----------------------------------------------------------------------------
//  CAMERA AND INTERACTION STATE / ESTADO DA CÂMERA E INTERAÇÃO
// -----------------------------------------------------------------------------
let camDistance = parseFloat(distSlider.value);
let camInclinationDeg = parseInt(incSlider.value); // EN: Inclination angle (0 deg = equatorial, 90 deg = polar) / PT: Ângulo de inclinação
let camAzimuth = 0.0;                              // EN: Azimuthal orbital angle around z-axis / PT: Ângulo azimutal ao redor do eixo z
let isDragging = false;                            // EN: Mouse/touch dragging flag / PT: Flag de arrasto do mouse/touch
let previousMousePosition = { x: 0, y: 0 };        // EN: Last recorded pointer position / PT: Última posição gravada do ponteiro

// EN: Modal toggle event listeners / PT: Listeners para abrir e fechar o modal teórico
toggleTheoryBtn.addEventListener('click', () => theoryModal.classList.remove('hidden'));
closeTheoryBtn.addEventListener('click', () => theoryModal.classList.add('hidden'));

/**
 * EN: Calculates the Prograde Innermost Stable Circular Orbit (ISCO) radius in Kerr metric.
 *     Uses exact analytical formula from Bardeen, Press & Teukolsky (1972).
 *     Optimized using native Math.cbrt for exact precision and performance.
 * 
 * PT: Calcula o raio da Órbita Circular Estável Mais Interna (ISCO) prograde na métrica de Kerr.
 *     Utiliza a fórmula analítica exata de Bardeen, Press & Teukolsky (1972).
 *     Otimizado usando Math.cbrt nativo para precisão e performance superiores.
 * 
 * @param {number} a - Dimensionless spin parameter (-1 < a < 1, normalized with M=1).
 * @returns {number} Radius of ISCO in units of gravitational mass M.
 */
function calculateISCO(a) {
    const x1 = 1.0 + Math.cbrt(1.0 - a * a) * (Math.cbrt(1.0 + a) + Math.cbrt(1.0 - a));
    const x2 = Math.sqrt(3.0 * a * a + x1 * x1);
    return 3.0 + x2 - Math.sqrt((3.0 - x1) * (3.0 + x1 + 2.0 * x2));
}

/**
 * EN: Synchronizes UI textual labels and canvas filters with current slider control values.
 * PT: Sincroniza os rótulos de texto da UI e filtros do canvas com os valores atuais dos sliders.
 */
function updateUI() {
    spinValue.textContent = parseFloat(spinSlider.value).toFixed(2);
    incValue.textContent = incSlider.value + '\u00B0';
    distValue.textContent = parseFloat(distSlider.value).toFixed(1) + 'M';
    tempValue.textContent = tempSlider.value + 'K';
    outerValue.textContent = parseFloat(outerSlider.value).toFixed(1) + 'M';
    stepValue.textContent = parseFloat(stepSlider.value).toFixed(2);
    iterValue.textContent = iterSlider.value;
    blurValue.textContent = parseFloat(blurSlider.value).toFixed(1) + 'px';
    canvas.style.filter = `blur(${blurSlider.value}px)`;
}

// EN: Attach updateUI listeners to all interactive controls / PT: Registra listeners de atualização para todos os controles
[spinSlider, incSlider, distSlider, tempSlider, outerSlider, stepSlider, blurSlider, iterSlider].forEach(slider => {
    slider.addEventListener('input', () => {
        updateUI();
        camDistance = parseFloat(distSlider.value);
        camInclinationDeg = parseInt(incSlider.value);
    });
});

// -----------------------------------------------------------------------------
//  MOUSE CONTROL EVENT LISTENERS / LISTENERS DE INTERAÇÃO VIA MOUSE
// -----------------------------------------------------------------------------
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
    camAzimuth -= deltaX * 0.007;
    camInclinationDeg = Math.max(-89, Math.min(89, camInclinationDeg - deltaY * 0.2));
    incSlider.value = Math.round(camInclinationDeg);
    updateUI();
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

// -----------------------------------------------------------------------------
//  TOUCH GESTURES & PINCH-TO-ZOOM / GESTOS TOUCH E PINCH-TO-ZOOM
// -----------------------------------------------------------------------------
let touchStartDist = 0;
canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        // EN: Two-finger touch start: compute initial pinch distance / PT: Início de toque duplo: calcula distância inicial do pinch
        touchStartDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    } else if (e.touches.length === 1) {
        // EN: Single-finger touch start: initiate camera panning / PT: Toque único: inicia rotação da câmera
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
});

window.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) touchStartDist = 0;
    if (e.touches.length === 0) isDragging = false;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && touchStartDist > 0) {
        // EN: Handle Pinch-to-Zoom gesture / PT: Processa gesto de Pinch-to-Zoom
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = touchStartDist / dist;
        let newDist = camDistance * factor;
        const minVal = parseFloat(distSlider.min) || 5.0;
        const maxVal = parseFloat(distSlider.max) || 80.0;
        newDist = Math.max(minVal, Math.min(maxVal, newDist));
        camDistance = newDist;
        distSlider.value = newDist;
        touchStartDist = dist;
        updateUI();
    } else if (e.touches.length === 1 && isDragging) {
        // EN: Handle single finger drag rotation / PT: Processa rotação por arrasto de dedo único
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;
        camAzimuth -= deltaX * 0.007;
        camInclinationDeg = Math.max(-89, Math.min(89, camInclinationDeg - deltaY * 0.2));
        incSlider.value = Math.round(camInclinationDeg);
        updateUI();
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
});

// -----------------------------------------------------------------------------
//  WEBGL CONTEXT INITIALIZATION & LOSS RECOVERY / WEBGL E RECUPERAÇÃO DE CONTEXTO
// -----------------------------------------------------------------------------
const gl = canvas.getContext('webgl');
if (!gl) {
    alert('Desculpe, seu navegador nao suporta WebGL. / Sorry, your browser does not support WebGL.');
}

canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    console.warn('WebGL context lost. Waiting for restoration...');
}, false);

canvas.addEventListener('webglcontextrestored', () => {
    console.log('WebGL context restored.');
    resizeCanvas();
}, false);

// -----------------------------------------------------------------------------
//  VERTEX SHADER SOURCE / CÓDIGO-FONTE DO VERTEX SHADER
// -----------------------------------------------------------------------------
// EN: Full-screen quad vertex shader / PT: Vertex shader para quad de tela cheia
const vsSource = `
attribute vec2 position;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

// -----------------------------------------------------------------------------
//  FRAGMENT SHADER SOURCE / CÓDIGO-FONTE DO FRAGMENT SHADER
// -----------------------------------------------------------------------------
// EN: High-precision relativistic ray tracer running on GPU in Kerr spacetime
// PT: Ray tracer relativístico de alta precisão rodando na GPU em espaço-tempo de Kerr
const fsSource = `
#ifdef GL_ES
precision highp float;
#endif

// EN: Resolution and Camera Uniforms / PT: Uniforms de Resolução e Câmera
uniform vec2 u_resolution;
uniform vec3 u_camPos;
uniform vec3 u_camDir;
uniform vec3 u_camRight;
uniform vec3 u_camUp;

// EN: Physical Parameters / PT: Parâmetros Físicos
uniform float u_spin;
uniform float u_temp;
uniform float u_outerRadius;
uniform float u_isco;
uniform float u_dt;
uniform float u_time;

// EN: Physical Feature Switches & Integrator Settings / PT: Toggles Físicos e Configuração do Integrador
uniform bool u_lensing;
uniform bool u_beaming;
uniform bool u_redshift;
uniform bool u_dragging;
uniform bool u_showPhotonSphere;
uniform bool u_enableAA;
uniform int u_max_iters;

/**
 * EN: 3D Hash function for pseudo-random noise generation.
 * PT: Função de hash 3D para geração de ruído pseudo-aleatório.
 */
float hash(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p.xyz, p.yzx + 19.19);
    return fract(p.x * p.y * p.z);
}

/**
 * EN: 3D Perlin-like gradient noise function for procedural accretion disk & stars.
 * PT: Função de ruído suave 3D estilo Perlin para o disco de acreção procedural e estrelas.
 */
float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(hash(i + vec3(0.0,0.0,0.0)), hash(i + vec3(1.0,0.0,0.0)), u.x),
            mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), u.x), u.y),
               mix(mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), u.x),
                   mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), u.x), u.y), u.z
    );
}

/**
 * EN: Renders procedural background stars and cosmic dust nebulae band.
 * PT: Renderiza o campo de estrelas procedural de fundo e poeira galáctica.
 */
vec3 getStarfield(vec3 rd) {
    vec3 color = vec3(0.0);
    float band = smoothstep(0.3, 0.0, abs(rd.z + 0.1 * sin(rd.x * 2.0 + rd.y * 1.5)));
    float neb = noise(rd * 3.5) * 0.5 + noise(rd * 7.0) * 0.25;
    vec3 nebulaCol = mix(vec3(0.005, 0.01, 0.02), vec3(0.03, 0.015, 0.005), noise(rd * 2.0 + 1.0));
    color += nebulaCol * band * (0.5 + neb);
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
            vec3 starCol = mix(vec3(1.0, 0.78, 0.62), vec3(0.68, 0.86, 1.0), hash(ip + 6.0));
            color += starCol * intensity * 1.6;
        }
    }
    return color;
}

/**
 * EN: Converts thermodynamic Kelvin temperature to RGB color using Tanner Helland algorithm.
 * PT: Converte temperatura termodinâmica em Kelvin para cor RGB pelo algoritmo de Tanner Helland.
 */
vec3 blackbody(float Temp) {
    float t = clamp(Temp / 100.0, 10.0, 400.0);
    float r, g, b;
    if (t <= 66.0) {
        r = 255.0;
    } else {
        r = 329.698727446 * pow(t - 60.0, -0.1332047592);
    }
    if (t <= 66.0) {
        g = 99.4708025861 * log(t) - 161.1195681661;
    } else {
        g = 288.1221695283 * pow(t - 60.0, -0.0755148492);
    }
    if (t >= 66.0) {
        b = 255.0;
    } else if (t <= 19.0) {
        b = 0.0;
    } else {
        b = 138.5177312231 * log(t - 10.0) - 305.0447927307;
    }
    return vec3(clamp(r / 255.0, 0.0, 1.0), clamp(g / 255.0, 0.0, 1.0), clamp(b / 255.0, 0.0, 1.0));
}

/**
 * EN: Computes physical Boyer-Lindquist radial coordinate r from Cartesian position in Kerr spacetime.
 *     Solves quadratic equation for oblate ellipsoids: (x^2+y^2)/(r^2+a^2) + z^2/r^2 = 1.
 * 
 * PT: Computa a coordenada radial física de Boyer-Lindquist r a partir da posição cartesiana em Kerr.
 *     Resolve a equação quadrática para elipsoides oblatos: (x^2+y^2)/(r^2+a^2) + z^2/r^2 = 1.
 */
float boyerLindquistR(vec3 pos, float a) {
    float R2 = dot(pos, pos);
    float b = R2 - a * a;
    return sqrt(max(0.001, 0.5 * (b + sqrt(b * b + 4.0 * a * a * pos.z * pos.z))));
}

/**
 * EN: Evaluates Kerr-Schild metric parameters f(r, theta), l_mu null vector, and spatial derivatives df, dl.
 *     Required for geodesic integration in conservative Hamiltonian formulation (Chan et al. 2018).
 * 
 * PT: Avalia os parâmetros da métrica de Kerr-Schild f(r, theta), vetor nulo l_mu, e derivadas df, dl.
 *     Necessário para a integração de geodésicas na formulação hamiltoniana conservativa (Chan et al. 2018).
 */
void getKS_Derivatives(vec3 pos, float M, float a, out float r, out float Sigma, out float f, out vec3 df, out mat3 dl) {
    float R2 = dot(pos, pos);
    float a2 = a * a;
    float b = R2 - a2;
    float disc = sqrt(b * b + 4.0 * a2 * pos.z * pos.z);
    float r2 = 0.5 * (b + disc);
    r = sqrt(max(0.001, r2));

    Sigma = r2 + a2 * pos.z * pos.z / r2;
    f = 2.0 * M * r / Sigma;

    vec3 grad_r = vec3(pos.x * r, pos.y * r, pos.z * (r + a2 / r)) / Sigma;

    float dSigma_dr = 2.0 * r - 2.0 * a2 * pos.z * pos.z / (r2 * r);
    vec3 grad_Sigma = dSigma_dr * grad_r;
    grad_Sigma.z += 2.0 * a2 * pos.z / r2;

    df = 2.0 * M * (Sigma * grad_r - r * grad_Sigma) / (Sigma * Sigma);

    float r2_a2 = r2 + a2;
    float num1 = r * pos.x + a * pos.y;
    float num2 = r * pos.y - a * pos.x;

    vec3 dl1 = (vec3(grad_r.x * pos.x + r, grad_r.y * pos.x + a, grad_r.z * pos.x) - num1 * (2.0 * r * grad_r) / r2_a2) / r2_a2;
    vec3 dl2 = (vec3(grad_r.x * pos.y - a, grad_r.y * pos.y + r, grad_r.z * pos.y) - num2 * (2.0 * r * grad_r) / r2_a2) / r2_a2;
    vec3 dl3 = (vec3(0.0, 0.0, r) - pos.z * grad_r) / r2;

    dl = mat3(dl1, dl2, dl3);
}

/**
 * EN: Computes Hamiltonian canonical derivatives dx/dlambda and dp/dlambda for photon null geodesics.
 * PT: Computa as derivadas canônicas hamiltonianas dx/dlambda e dp/dlambda para geodésicas nulas de fótons.
 */
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

/**
 * EN: Keplerian orbital angular velocity Omega_K = dphi/dt in Kerr spacetime (prograde equatorial orbit).
 * PT: Velocidade angular orbital Kepleriana Omega_K = dphi/dt no espaço-tempo de Kerr (órbita equatorial prograde).
 */
float keplerianOmega(float r, float M, float a) {
    return sqrt(M) / (pow(r, 1.5) + a * sqrt(M));
}

/**
 * EN: Keplerian orbital angular velocity in Schwarzschild spacetime (a = 0).
 * PT: Velocidade angular orbital Kepleriana no espaço-tempo de Schwarzschild (a = 0).
 */
float keplerianOmegaSchwarzschild(float r, float M) {
    return sqrt(M / pow(r, 3.0));
}

/**
 * EN: ZAMO (Zero Angular Momentum Observer) frame dragging angular velocity Omega_ZAMO = -g_tphi / g_phiphi.
 * PT: Velocidade angular de arraste de referenciais ZAMO Omega_ZAMO = -g_tphi / g_phiphi.
 */
float zamoOmega(float r, float M, float a) {
    float g_tphi = -2.0 * M * a / r;
    float g_phiphi = r * r + a * a + 2.0 * M * a * a / r;
    return -g_tphi / g_phiphi;
}

/**
 * EN: Computes rotating multi-scale noise pattern for accretion disk turbulence with differential shear.
 * PT: Computa padrão de ruído rotacional multi-escala para turbulência do disco com cisalhamento diferencial.
 */
float getDiskNoise(vec3 p, float Omega_K) {
    float angle = -2.5 * Omega_K * u_time;
    float c = cos(angle);
    float s = sin(angle);
    vec3 p_rot = vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
    float n1 = noise(p_rot * 1.8);
    float n2 = noise(p_rot * 4.2 + vec3(0.0, 0.0, u_time * 0.15)) * 0.5;
    float n3 = noise(p_rot * 8.5) * 0.25;
    return (n1 + n2 + n3) / 1.75;
}

/**
 * EN: Primary ray tracing pixel renderer. Traces photon backward from camera through spacetime.
 * PT: Renderizador principal por pixel do ray tracer. Traça o fóton no tempo reverso a partir da câmera.
 */
vec3 renderPixel(vec2 uv) {
    float fov = 0.9;
    vec3 rd = normalize(u_camDir + fov * (uv.x * u_camRight + uv.y * u_camUp));

    float M = 1.0;
    float a = u_spin;
    float a_geo = u_dragging ? a : 0.0;
    vec3 pos = u_camPos;

    // EN: Initial metric setup at observer location / PT: Configuração da métrica inicial na posição do observador
    float r_cam, Sigma_cam, f_cam;
    vec3 df_cam;
    mat3 dl_cam;
    getKS_Derivatives(u_camPos, M, a_geo, r_cam, Sigma_cam, f_cam, df_cam, dl_cam);

    float r2_cam = r_cam * r_cam;
    float r2_a2_cam = r2_cam + a_geo * a_geo;
    vec3 l_cam = vec3(
        (r_cam * u_camPos.x + a_geo * u_camPos.y) / r2_a2_cam,
        (r_cam * u_camPos.y - a_geo * u_camPos.x) / r2_a2_cam,
        u_camPos.z / r_cam
    );

    // EN: Compute physical photon momentum vector p_mu matching Kerr-Schild metric at observer
    // PT: Computa o vetor de momento físico do fóton p_mu compatível com a métrica de Kerr-Schild no observador
    float A_cam = dot(rd, l_cam);
    float disc_k = f_cam * f_cam * A_cam * A_cam + (1.0 - f_cam * A_cam * A_cam) * (1.0 + f_cam);
    float denom = 1.0 - f_cam * A_cam * A_cam;
    if (abs(denom) < 0.0001) denom = sign(denom) * 0.0001;
    float k = (-f_cam * A_cam + sqrt(max(0.0, disc_k))) / denom;
    vec3 mom = k * rd;

    // EN: Conserved z-component of angular momentum L_z / PT: Componente z conservada do momento angular L_z
    float L_z = u_camPos.x * mom.y - u_camPos.y * mom.x;

    // EN: Observer redshift factor g_obs / PT: Fator de redshift do observador g_obs
    float g_obs = sqrt(max(0.001, 1.0 - f_cam));

    // EN: Initial ray dithering to eliminate color banding artifacts
    // PT: Dithering inicial para eliminar artefatos de fatiamento de cor (banding)
    float dither = fract(sin(dot(uv.xy, vec2(12.9898, 78.233))) * 43758.5453) * u_dt;
    pos += mom * dither;

    vec3 accumCol = vec3(0.0);
    float accumAlpha = 0.0;

    // EN: Main Geodesic Integration Loop / PT: Loop Principal de Integração de Geodésicas
    for (int i = 0; i < 1000; i++) {
        if (i >= u_max_iters) break;

        float r, Sigma, f;
        vec3 df;
        mat3 dl;
        getKS_Derivatives(pos, M, a_geo, r, Sigma, f, df, dl);

        // EN: Outer Event Horizon r_h = M + sqrt(M^2 - a^2) / PT: Horizonte de Eventos Externo r_h
        float r_h = M + sqrt(max(0.0, M*M - a_geo*a_geo));
        float r_eff = boyerLindquistR(pos, a_geo);
        float r_horizon_threshold = r_h + 0.02;

        // EN: Horizon capture check / PT: Verificação de captura pelo horizonte de eventos
        if (r_eff <= r_horizon_threshold) {
            accumAlpha = 1.0;
            break;
        }

        // EN: Adaptive step size optimization / PT: Passo de integração adaptativo
        float current_dt = u_dt * clamp(r / 1.5, 0.2, 50.0);
        if (r < 3.5 * M) {
            float distToHorizon = max(0.01, r - r_h);
            current_dt *= clamp(distToHorizon / (3.5 * M - r_h), 0.05, 1.0);
        }
        if (abs(pos.z) < 1.2 && r >= u_isco - 0.5 && r <= u_outerRadius + 2.0) {
            current_dt = min(current_dt, u_dt * 3.0);
        }

        vec3 prev_pos = pos;
        vec3 next_pos = pos;
        vec3 next_mom = mom;

        // EN: 4th-Order Runge-Kutta (RK4) Geodesic Integrator / PT: Integrador Geodésico Runge-Kutta de 4ª Ordem (RK4)
        if (u_lensing) {
            vec3 k1_pos, k1_mom;
            getHamiltonianDerivatives(pos, mom, M, a_geo, k1_pos, k1_mom);

            vec3 m2_pos = pos + 0.5 * current_dt * k1_pos;
            vec3 m2_mom = mom + 0.5 * current_dt * k1_mom;
            vec3 k2_pos, k2_mom;
            getHamiltonianDerivatives(m2_pos, m2_mom, M, a_geo, k2_pos, k2_mom);

            vec3 m3_pos = pos + 0.5 * current_dt * k2_pos;
            vec3 m3_mom = mom + 0.5 * current_dt * k2_mom;
            vec3 k3_pos, k3_mom;
            getHamiltonianDerivatives(m3_pos, m3_mom, M, a_geo, k3_pos, k3_mom);

            vec3 m4_pos = pos + current_dt * k3_pos;
            vec3 m4_mom = mom + current_dt * k3_mom;
            vec3 k4_pos, k4_mom;
            getHamiltonianDerivatives(m4_pos, m4_mom, M, a_geo, k4_pos, k4_mom);

            next_pos = pos + (current_dt / 6.0) * (k1_pos + 2.0 * k2_pos + 2.0 * k3_pos + k4_pos);
            next_mom = mom + (current_dt / 6.0) * (k1_mom + 2.0 * k2_mom + 2.0 * k3_mom + k4_mom);
        } else {
            next_pos = pos + current_dt * mom;
            next_mom = mom;
        }

        // EN: Photon Sphere Visual Shell Indicator / PT: Indicador Visual da Esfera de Fótons
        if (u_showPhotonSphere) {
            float r_photon;
            if (u_dragging) {
                r_photon = 2.0 * M * (1.0 + cos((2.0 / 3.0) * acos(clamp(-a / M, -0.999, 0.999))));
            } else {
                r_photon = 3.0 * M;
            }
            float r_prev_BL = boyerLindquistR(prev_pos, a_geo);
            float r_curr_BL = boyerLindquistR(next_pos, a_geo);

            if ((r_prev_BL - r_photon) * (r_curr_BL - r_photon) < 0.0 && r_curr_BL > r_horizon_threshold) {
                float dr_step = abs(r_curr_BL - r_prev_BL);
                float glance = 1.0 - clamp(dr_step / (r_photon * 0.15), 0.0, 1.0);
                glance = glance * glance;

                if (glance > 0.05) {
                    float t_cross = (r_photon - r_prev_BL) / (r_curr_BL - r_prev_BL);
                    vec3 pos_cross = prev_pos + t_cross * (next_pos - prev_pos);
                    float theta = acos(clamp(pos_cross.z / r_photon, -1.0, 1.0));
                    float phi = atan(pos_cross.y, pos_cross.x);
                    float gridTheta = smoothstep(0.92, 1.0, cos(theta * 12.0));
                    float gridPhi = smoothstep(0.92, 1.0, cos(phi * 24.0));
                    float shellGrid = max(gridTheta, gridPhi);

                    if (sin(theta) > 0.05) {
                        vec3 auraCol = vec3(0.0, 0.85, 1.0);
                        accumCol += (1.0 - accumAlpha) * auraCol * shellGrid * 0.5 * glance;
                        accumAlpha += (1.0 - accumAlpha) * 0.15 * shellGrid * glance;
                    }
                }
            }
        }

        // EN: Volumetric Accretion Disk Thermodynamics & Radiative Transfer
        // PT: Termodinâmica e Transferência Radiativa do Disco de Acreção Volumétrico
        float r_disk = boyerLindquistR(next_pos, a);
        float H = 0.8;

        if (abs(next_pos.z) < H && r_disk > r_horizon_threshold && r_disk <= u_outerRadius) {

            // EN: Compute Orbital Velocity Omega_K (Keplerian or Plunge Region ZAMO blend)
            // PT: Computa Velocidade Orbital Omega_K (Kepleriana ou mistura ZAMO na região de mergulho)
            float Omega_K;
            if (u_dragging) {
                if (r_disk >= u_isco) {
                    Omega_K = keplerianOmega(r_disk, M, a);
                } else {
                    float Omega_isco = keplerianOmega(max(0.1, u_isco), M, a);
                    float Omega_zamo = zamoOmega(r_disk, M, a);
                    float t_blend = smoothstep(r_horizon_threshold, u_isco, r_disk);
                    Omega_K = mix(Omega_zamo, Omega_isco, t_blend);
                }
            } else {
                if (r_disk >= u_isco) {
                    Omega_K = keplerianOmegaSchwarzschild(r_disk, M);
                } else {
                    float Omega_isco = keplerianOmegaSchwarzschild(max(0.1, u_isco), M);
                    float t_blend = smoothstep(r_horizon_threshold, u_isco, r_disk);
                    Omega_K = mix(0.0, Omega_isco, t_blend);
                }
            }

            float g_factor = 1.0;

            // EN: Relativistic Gravitational Redshift g_emit / PT: Redshift Gravitacional Relativístico g_emit
            if (u_redshift) {
                float g_tt = -(1.0 - 2.0 * M / r_disk);
                float g_tphi = -2.0 * M * a / r_disk;
                float g_phiphi = r_disk * r_disk + a * a + 2.0 * M * a * a / r_disk;

                float u_t_inv_sq = -(g_tt + 2.0 * Omega_K * g_tphi + Omega_K * Omega_K * g_phiphi);
                float g_emit = sqrt(max(0.001, u_t_inv_sq));

                g_factor = g_obs * g_emit;
            }

            // EN: Relativistic Doppler Beaming g_doppler / PT: Amplificação por Doppler Relativístico g_doppler
            if (u_beaming) {
                float dop_denom = 1.0 - Omega_K * L_z;
                dop_denom = max(dop_denom, 0.02);
                float g_doppler = 1.0 / dop_denom;
                g_factor *= g_doppler;
            }

            g_factor = clamp(g_factor, 0.05, 3.0);

            // EN: Novikov-Thorne Temperature Profile T(r) / PT: Perfil de Temperatura Novikov-Thorne T(r)
            float peak_r = max(0.1, u_isco) * 1.36;
            float rr = max(r_disk, peak_r) / max(0.1, u_isco);
            float T_profile = pow(1.0 / rr, 0.75) * pow(max(0.001, 1.0 - sqrt(1.0 / rr)), 0.25);
            float T = u_temp * T_profile * 2.2;
            float T_obs = g_factor * T;

            // EN: Blackbody emission color & Stefan-Boltzmann luminosity scaling
            // PT: Cor de emissão de corpo negro e brilho baseado na lei de Stefan-Boltzmann
            vec3 col = blackbody(T_obs);
            float brightness = pow(clamp(T_obs / 5000.0, 0.0, 5.0), 4.0) * 0.5;

            // EN: Gaussian vertical decay and exponential radial density
            // PT: Decaimento gaussiano vertical e densidade radial exponencial
            float vertical_decay = exp(-(next_pos.z * next_pos.z) / 0.06);
            float radial_decay;
            if (r_disk >= u_isco) {
                radial_decay = exp(-0.15 * (r_disk - u_isco));
            } else {
                radial_decay = smoothstep(r_horizon_threshold, u_isco, r_disk);
            }

            float density = radial_decay * vertical_decay;
            float pattern = 0.4 + 0.6 * getDiskNoise(next_pos, Omega_K);
            density *= pattern;

            // EN: Beer-Lambert Volumetric Absorption and Step Emission
            // PT: Absorção Volumétrica pela lei de Beer-Lambert e Emissão por Passo
            float opacity_coef = 3.5;
            float step_alpha = 1.0 - exp(-density * current_dt * opacity_coef);
            vec3 step_emission = col * brightness * step_alpha * (12.0 / opacity_coef);

            accumCol += (1.0 - accumAlpha) * step_emission;
            accumAlpha += (1.0 - accumAlpha) * step_alpha;

            if (accumAlpha > 0.98) {
                break;
            }
        }

        pos = next_pos;
        mom = next_mom;

        // EN: Dynamic escape radius scaling with camera distance / PT: Raio de escape dinâmico escalando com a distância da câmera
        float camDist = length(u_camPos);
        float escapeRadius2 = max(900.0, 2.0 * camDist * camDist);
        if (dot(pos, pos) > escapeRadius2) {
            break;
        }
    }

    // EN: Background starfield composition for unabsorbed rays / PT: Composição com estrelas de fundo para raios não absorvidos
    if (accumAlpha < 1.0) {
        vec3 bgCol = getStarfield(normalize(mom));
        accumCol += (1.0 - accumAlpha) * bgCol;
    }

    return accumCol;
}

// -----------------------------------------------------------------------------
//  MAIN FRAGMENT ENTRY & POST-PROCESSING / PONTO DE ENTRADA E PÓS-PROCESSAMENTO
// -----------------------------------------------------------------------------
void main() {
    vec3 finalCol = vec3(0.0);

    if (u_enableAA) {
        // EN: Super-Sample Anti-Aliasing (SSAA 2x) / PT: Antialiasing Super-Sample (SSAA 2x)
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
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
        finalCol = renderPixel(uv);
    }

    // EN: Reinhard Tone Mapping & sRGB Gamma Correction (gamma = 2.2)
    // PT: Mapeamento de Tom de Reinhard e Correção de Gama sRGB (gama = 2.2)
    finalCol = finalCol / (finalCol + vec3(1.0));
    finalCol = pow(finalCol, vec3(1.0 / 2.2));

    gl_FragColor = vec4(finalCol, 1.0);
}
`;

// -----------------------------------------------------------------------------
//  WEBGL SHADER & PROGRAM COMPILATION HELPERS / COMPILAÇÃO DE SHADERS E PROGRAMA
// -----------------------------------------------------------------------------
/**
 * EN: Compiles WebGL Shader from GLSL source. Reports detailed line errors if compilation fails.
 * PT: Compila Shader WebGL a partir do código GLSL. Reporta erros detalhados por linha se a compilação falhar.
 */
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
        console.error('Erro ao compilar shader / Shader compile error:', gl.getShaderInfoLog(shader));
        const lines = source.split('\n');
        lines.forEach((line, i) => console.error(`${i+1}: ${line}`));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Erro ao linkar programa / Program link error:', gl.getProgramInfoLog(program));
}

// -----------------------------------------------------------------------------
//  FULL-SCREEN QUAD GEOMETRY / GEOMETRIA DO QUAD DE TELA CHEIA
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
//  UNIFORM & ATTRIBUTE LOCATIONS / LOCALIZAÇÃO DE UNIFORMS E ATRIBUTOS
// -----------------------------------------------------------------------------
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
const timeLocation = gl.getUniformLocation(program, 'u_time');
const iterLocation = gl.getUniformLocation(program, 'u_max_iters');

const lensingLocation = gl.getUniformLocation(program, 'u_lensing');
const beamingLocation = gl.getUniformLocation(program, 'u_beaming');
const redshiftLocation = gl.getUniformLocation(program, 'u_redshift');
const draggingLocation = gl.getUniformLocation(program, 'u_dragging');
const photonSphereLocation = gl.getUniformLocation(program, 'u_showPhotonSphere');
const aaLocation = gl.getUniformLocation(program, 'u_enableAA');

// -----------------------------------------------------------------------------
//  DYNAMIC CANVAS RESIZING / REDIMENSIONAMENTO DINÂMICO DO CANVAS
// -----------------------------------------------------------------------------
/**
 * EN: Resizes WebGL viewport based on window dimensions. Caps total pixel count to 1920x1080 to protect GPU.
 * PT: Redimensiona a viewport WebGL com base na janela. Limita os pixels a 1920x1080 para proteger a GPU.
 */
function resizeCanvas() {
    let displayWidth = window.innerWidth;
    let displayHeight = window.innerHeight;
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

const startTime = Date.now();

// -----------------------------------------------------------------------------
//  MAIN RENDER LOOP / LOOP PRINCIPAL DE RENDERIZAÇÃO
// -----------------------------------------------------------------------------
/**
 * EN: Main animation frame callback. Updates uniforms, camera coordinates, and executes WebGL draw call.
 * PT: Callback principal do frame de animação. Atualiza uniforms, câmera e executa chamada de desenho WebGL.
 */
function render() {
    resizeCanvas();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // EN: Compute 3D Camera Spherical Position Vector / PT: Computa Posição 3D da Câmera em Coordenadas Esféricas
    const inclinationRad = (90 - camInclinationDeg) * Math.PI / 180.0;

    const camX = camDistance * Math.sin(inclinationRad) * Math.cos(camAzimuth);
    const camY = camDistance * Math.sin(inclinationRad) * Math.sin(camAzimuth);
    const camZ = camDistance * Math.cos(inclinationRad);

    const camPos = [camX, camY, camZ];

    // EN: Compute Camera Orthonormal View Vectors (Forward, Right, Up)
    // PT: Computa Vetores Ortogonis de Visão da Câmera (Frente, Direita, Cima)
    let camDir = [-camX, -camY, -camZ];
    const dirLen = Math.sqrt(camDir[0]*camDir[0] + camDir[1]*camDir[1] + camDir[2]*camDir[2]);
    camDir = [camDir[0]/dirLen, camDir[1]/dirLen, camDir[2]/dirLen];

    let upRef = [0, 0, 1];
    if (Math.abs(camDir[2]) > 0.99) {
        upRef = [0, 1, 0];
    }

    let rx = upRef[1] * camDir[2] - upRef[2] * camDir[1];
    let ry = upRef[2] * camDir[0] - upRef[0] * camDir[2];
    let rz = upRef[0] * camDir[1] - upRef[1] * camDir[0];
    const rLen = Math.sqrt(rx*rx + ry*ry + rz*rz);
    const camRight = [rx / rLen, ry / rLen, rz / rLen];

    const ux = camRight[1] * camDir[2] - camRight[2] * camDir[1];
    const uy = camRight[2] * camDir[0] - camRight[0] * camDir[2];
    const uz = camRight[0] * camDir[1] - camRight[1] * camDir[0];
    const camUp = [ux, uy, uz];

    // EN: Pass Uniform Values to GPU Fragment Shader / PT: Envia os Valores de Uniforms para o Fragment Shader na GPU
    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform3fv(camPosLocation, camPos);
    gl.uniform3fv(camDirLocation, camDir);
    gl.uniform3fv(camRightLocation, camRight);
    gl.uniform3fv(camUpLocation, camUp);

    const spin = parseFloat(spinSlider.value);
    gl.uniform1f(spinLocation, spin);
    gl.uniform1f(tempLocation, parseFloat(tempSlider.value));
    gl.uniform1f(outerRadiusLocation, parseFloat(outerSlider.value));

    const isco = calculateISCO(spin);
    gl.uniform1f(iscoLocation, isco);
    gl.uniform1f(dtLocation, parseFloat(stepSlider.value));

    const maxIters = parseInt(document.getElementById('iter-slider').value) || 150;
    gl.uniform1i(iterLocation, maxIters);

    const time = (Date.now() - startTime) / 1000.0;
    gl.uniform1f(timeLocation, time);

    gl.uniform1i(lensingLocation, toggleLensing.checked);
    gl.uniform1i(beamingLocation, toggleBeaming.checked);
    gl.uniform1i(redshiftLocation, toggleRedshift.checked);
    gl.uniform1i(draggingLocation, toggleDragging.checked);
    gl.uniform1i(photonSphereLocation, togglePhotonSphere.checked);
    gl.uniform1i(aaLocation, toggleAA.checked);

    // EN: Execute WebGL Draw Call / PT: Executa Chamada de Desenho no WebGL
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}

// EN: Initialize UI and Start Animation Loop / PT: Inicializa UI e Inicia Loop de Animação
updateUI();
requestAnimationFrame(render);
