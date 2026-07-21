*Leia isto em outros idiomas: [English](README.md), [Português](README_pt.md).*

# 🌌 Gargantua: Relativistic Kerr Black Hole Simulator

> Um simulador interativo de **Buraco Negro Rotativo (Kerr)**, rodando 100% no navegador. Desenvolvido em **HTML5, Javascript e WebGL (Fragment Shader)**, ele realiza traçado de raios reverso (reverse ray tracing) resolvendo numericamente geodésicas nulas de fótons no espaço-tempo curvo de Kerr.

A simulação incorpora geodésicas completas de Kerr usando formulação hamiltoniana conservativa em coordenadas de Kerr-Schild, integrador numérico RK4 de alta precisão, disco de acreção volumétrico com termodinâmica de Novikov-Thorne, esferas de fótons de Kerr com anéis de Einstein, Amplificação por Doppler Relativístico (Beaming), Redshift Gravitacional e Antialiasing por Supersampling (SSAA 2x).

> **Aviso:** Este é um projeto de hobby independente. Não sou físico acadêmico ou engenheiro de software especialista. O código foi feito com paixão pela astronomia, incorporando equações rigorosas de relatividade geral e aproximações numéricas eficientes. Modifique e estude por sua conta e risco!

---

## 📸 Preview (Demonstração)

<p align="center">
  <img src="image.png" alt="Gargantua Black Hole">
  <br>
  <i>Renderização em tempo real na GPU do buraco negro supermassivo.</i>
</p>

---

## Sumário
1. [Metodologia de Renderização (Ray Tracing Reverso)](#1-metodologia-de-renderizacao-ray-tracing-reverso)
2. [Geometria do Espaço-Tempo de Kerr-Schild](#2-geometria-do-espaco-tempo-de-kerr-schild)
3. [Integração das Geodésicas Relativísticas (RK4 Hamiltoniano Conservativo)](#3-integracao-das-geodesicas-relativisticas-rk4-hamiltoniano-conservativo)
4. [Arrasto de Referencial (Frame Dragging) e Movimento no Mergulho ZAMO](#4-arrasto-de-referencial-frame-dragging-e-movimento-no-mergulho-zamo)
5. [Física do Disco de Acreção Volumétrico](#5-fisica-do-disco-de-acrecao-volumetrico)
   - [Perfil Térmico de Novikov-Thorne Normalizado](#51-perfil-termico-de-novikov-thorne-normalizado)
   - [Modelagem Volumétrica 3D do Gás (Lei de Beer-Lambert)](#52-modelagem-volumetrica-3d-do-gas-lei-de-beer-lambert)
   - [Luminosidade de Stefan-Boltzmann e Redshift/Beaming Relativístico](#53-luminosidade-de-stefan-boltzmann-e-redshiftbeaming-relativistico)
6. [Guia Visual: Esfera de Fótons Dinâmica de Kerr](#6-guia-visual-esfera-de-fotons-dinamica-de-kerr)
7. [Otimizações de GPU e Raio de Escape Dinâmico](#7-otimizacoes-de-gpu-e-raio-de-escape-dinamico)
8. [Filtro de Borrão EHT e Antialiasing (SSAA 2x)](#8-filtro-de-borrao-eht-e-antialiasing-ssaa-2x)
9. [Referências Científicas](#9-referencias-cientificas)
10. [Instalação e Execução](#10-instalacao-e-execucao)

---

## 1. Metodologia de Renderização (Ray Tracing Reverso)

Para obter 60 FPS direto no navegador, o simulador utiliza **Ray Tracing Reverso** no *Fragment Shader* WebGL.

Em vez de simular fótons emitidos do disco de acreção em todas as direções aleatórias (onde apenas uma fração minúscula atingiria a câmera), os fótons são integrados de **trás para frente** no tempo, partindo da lente da câmera (observador) em direção ao buraco negro.

Para cada pixel da tela:
1. As coordenadas 2D da tela são mapeadas para um vetor tridimensional de direção inicial do fóton $\mathbf{n}$.
2. O momento canônico inicial do fóton $\mathbf{p}$ é calculado na posição do observador com base no tensor métrico de Kerr-Schild $f(r, \theta)$ e no vetor nulo $\mathbf{l}$.
3. A trajetória geodésica nula é integrada numericamente passo a passo pelo método Runge-Kutta de 4ª Ordem (RK4).
4. Conforme o fóton caminha, ele acumula emissão e opacidade do disco de acreção 3D pela lei de Beer-Lambert.
5. Se o fóton entra no horizonte de eventos externo ($r_{\text{eff}} \le r_+ = M + \sqrt{M^2 - a^2}$), a integração cessa imediatamente e o pixel é marcado como sombra do buraco negro.
6. Se o fóton escapa para distâncias radiais maiores que o limite de escape dinâmico ($R^2 > R_{\text{escape}}^2$), o momento final é usado para amostrar o fundo de estrelas procedurais e poeira galáctica.

---

## 2. Geometria do Espaço-Tempo de Kerr-Schild

Um buraco negro rotativo com massa gravitacional $M$ e spin $J$ é descrito pela métrica de Kerr. O parâmetro de spin adimensional $a = J/M$ ($0 \le a < 1$) rege a rotação e o arrasto de referencial.

Em coordenadas cartesianas de Kerr-Schild $(x,y,z)$, o tensor métrico é decomposto no espaço plano de Minkowski mais um fator métrico escalar $f(r, \theta)$ e um vetor nulo $l_\mu$:
$$g_{\mu\nu} = \eta_{\mu\nu} + f l_\mu l_\nu$$
onde:
$$f(r, \theta) = \frac{2 M r^3}{r^4 + a^2 z^2}$$
$$l_\mu = \left(1, \frac{r x + a y}{r^2 + a^2}, \frac{r y - a x}{r^2 + a^2}, \frac{z}{r}\right)$$

A coordenada radial física $r$ de Kerr é calculada resolvendo a equação oblata:
$$\frac{x^2 + y^2}{r^2 + a^2} + \frac{z^2}{r^2} = 1$$
obtendo a solução quadrática exata:
$$r^2 = \frac{1}{2}\left(R^2 - a^2\right) + \frac{1}{2}\sqrt{\left(R^2 - a^2\right)^2 + 4 a^2 z^2}$$
onde $R^2 = x^2 + y^2 + z^2$. O horizonte de eventos externo localiza-se em:
$$r_+ = M + \sqrt{M^2 - a^2}$$

---

## 3. Integração das Geodésicas Relativísticas (RK4 Hamiltoniano Conservativo)

Fótons seguem geodésicas nulas ($ds^2 = 0$). O simulador utiliza a **Formulação Hamiltoniana Conservativa** (Chan, Medeiros & Ozel 2018; Bacchini et al. 2018) em coordenadas de Kerr-Schild para computar as equações de movimento da posição $\mathbf{x}$ e do momento $\mathbf{p}$:
$$\frac{d\mathbf{x}}{d\lambda} = \mathbf{p} - f \mathbf{l} V$$
$$\frac{d\mathbf{p}}{d\lambda} = \frac{1}{2} V^2 \nabla f + f V (\mathbf{p} \cdot \nabla \mathbf{l})$$
onde $V = (\mathbf{p} \cdot \mathbf{l}) - 1$.

A integração é realizada usando o **Método de Runge-Kutta de 4ª Ordem (RK4)**:
- $k_1 = g(\mathbf{x}, \mathbf{p})$
- $k_2 = g\left(\mathbf{x} + \frac{dt}{2} k_{1,x}, \mathbf{p} + \frac{dt}{2} k_{1,p}\right)$
- $k_3 = g\left(\mathbf{x} + \frac{dt}{2} k_{2,x}, \mathbf{p} + \frac{dt}{2} k_{2,p}\right)$
- $k_4 = g\left(\mathbf{x} + dt \cdot k_{3,x}, \mathbf{p} + dt \cdot k_{3,p}\right)$
- $\mathbf{x}_{\text{next}} = \mathbf{x} + \frac{dt}{6} (k_{1,x} + 2 k_{2,x} + 2 k_{3,x} + k_{4,x})$
- $\mathbf{p}_{\text{next}} = \mathbf{p} + \frac{dt}{6} (k_{1,p} + 2 k_{2,p} + 2 k_{3,p} + k_{4,p})$

O passo de integração adaptativo ($dt_{\text{local}}$) refina a resolução perto do horizonte de eventos e perto do plano médio do disco ($|z| < 1.2M$).

---

## 4. Arrasto de Referencial (Frame Dragging) e Movimento no Mergulho ZAMO

Quando o buraco negro rotaciona ($a > 0$), o próprio espaço-tempo é arrastado ao redor do eixo central (efeito Lense-Thirring).

1. **Arrasto Geodésico:** As derivadas métricas $\nabla f$ e $\nabla \mathbf{l}$ nas equações hamiltonianas arrastam as trajetórias da luz na direção do spin.
2. **Mistura de Velocidades no Mergulho (Plunge Region):** O plasma dentro da ISCO ($r < r_{\text{isco}}$) não mantém órbitas Keplerianas estáveis. A velocidade angular orbital $\Omega_K$ faz transição suave da velocidade Kepleriana na ISCO ($\Omega_{\text{isco}}$) para a velocidade de arraste ZAMO (Zero Angular Momentum Observer) ($\Omega_{\text{zamo}} = -g_{t\phi}/g_{\phi\phi}$) no horizonte:
$$\Omega_K(r) = \text{mix}\left(\Omega_{\text{zamo}}, \Omega_{\text{isco}}, \text{smoothstep}(r_+, r_{\text{isco}}, r)\right)$$

---

## 5. Física do Disco de Acreção Volumétrico

### 5.1 Perfil Térmico de Novikov-Thorne Normalizado
A matéria equatorial orbita fora da Órbita Circular Estável Mais Interna (ISCO). O raio ISCO prograde $r_{\text{isco}}$ é calculado pelas equações de Bardeen et al. (1972) com precisão nativa de `Math.cbrt`:
$$r_{\text{isco}} = M \left( 3 + x_2 - \sqrt{(3-x_1)(3+x_1+2x_2)} \right)$$
$$x_1 = 1 + \sqrt[3]{1 - a^2} \left( \sqrt[3]{1+a} + \sqrt[3]{1-a} \right)$$
$$x_2 = \sqrt{3 a^2 + x_1^2}$$

A temperatura do plasma segue o perfil relativístico de disco fino de **Novikov-Thorne** (1973):
$$T(r) = T_{\text{peak}} \cdot \left(\frac{r_{\text{isco}}}{r}\right)^{0.75} \cdot \left(1 - \sqrt{\frac{r_{\text{isco}}}{r}}\right)^{0.25} \cdot 2.2$$

### 5.2 Modelagem Volumétrica 3D do Gás (Lei de Beer-Lambert)
O disco possui espessura finita $H = 0.8M$, com decaimento gaussiano vertical e exponencial radial:
$$\rho(r, z) = e^{-0.15(r - r_{\text{isco}})} \cdot e^{-\frac{z^2}{0.06}} \cdot \text{Noise}_{3D}\left(\mathbf{p}_{\text{rot}}\right)$$

O ray marching volumétrico acumula opacidade e emissão ao longo da distância $dt$ usando a **Lei de Beer-Lambert**:
$$\Delta \alpha = 1 - e^{-\rho \cdot dt \cdot k_{\text{opacidade}}}$$
$$\mathbf{I}_{\text{acum}} = \mathbf{I}_{\text{acum}} + (1 - \alpha_{\text{acum}}) \cdot \mathbf{C}_{\text{emissao}} \cdot \Delta \alpha$$

### 5.3 Luminosidade de Stefan-Boltzmann e Redshift/Beaming Relativístico
1. **Redshift Gravitacional e Cinemático ($g_{\text{emit}}$):**
$$g_{\text{emit}} = \sqrt{- (g_{tt} + 2 \Omega_K g_{t\phi} + \Omega_K^2 g_{\phi\phi})}$$
$$g_{\text{fator}} = g_{\text{obs}} \cdot g_{\text{emit}} \cdot g_{\text{doppler}}$$

2. **Amplificação Doppler ($g_{\text{doppler}}$):**
$$g_{\text{doppler}} = \frac{1}{1 - \Omega_K L_z}$$
onde $L_z = x p_y - y p_x$ é a componente z conservada do momento angular do fóton.

A temperatura observada do plasma resulta em $T_{\text{obs}} = g_{\text{fator}} \cdot T(r)$, mapeada para emissão de corpo negro RGB pelo algoritmo de Tanner Helland. A luminosidade escala pela lei de Stefan-Boltzmann ($\propto T_{\text{obs}}^4$).

---

## 6. Guia Visual: Esfera de Fótons Dinâmica de Kerr

Quando ativada na interface, uma grade visual destaca a esfera de órbitas esféricas instáveis de fótons. Na métrica de Kerr, o raio dessa esfera varia entre $1.5M$ (prograde) e $4.0M$ (retrograde).

Quando a trajetória do fóton passa perto dessa borda ($r \approx r_{\text{foton}}$), uma aura ciano ($\text{RGB} = [0.0, 0.85, 1.0]$) com linhas de latitude e longitude é desenhada na integração do raio.

---

## 7. Otimizações de GPU e Raio de Escape Dinâmico

1. **Escala de Resolução:** Resoluções superiores a 1080p são limitadas ao máximo de $1920 \times 1080$ pixels para garantir 60 FPS fluidos em telas High-DPI.
2. **Raio de Escape Dinâmico:** O raio limite de escape para estrelas de fundo escala com a distância da câmera:
$$R_{\text{escape}}^2 = \max(900.0, 2.0 \cdot |\mathbf{x}_{\text{câmera}}|^2)$$
Isso permite afastar a câmera até $80.0M$ sem cortes no fundo estrelado ou manchas pretas.
3. **Suporte Touch em Dispositivos Móveis:** Suporta arrasto de um dedo para orbitar inclinação/azimute e gesto de pinch com dois dedos para controlar a distância de zoom.

---

## 8. Filtro de Borrão EHT e Antialiasing (SSAA 2x)

### 8.1 Filtro de Borrão de Lente (EHT Blur)
Emula o limite de resolução angular do Event Horizon Telescope (EHT) através de um slider de borrão gaussiano acelerado na GPU (até 20px) aplicado no canvas.

### 8.2 Antialiasing por Supersampling (SSAA 2x)
Quando ativo, amostra 4 sub-pixels em padrão de grade rotacionada por pixel:
$$\mathbf{I}_{\text{final}} = \frac{1}{4} \sum_{s=1}^{4} \mathbf{I}\left(\text{gl\_FragCoord} + \mathbf{offset}_s\right)$$

---

## 9. Referências Científicas

* **Métrica de Kerr (1963):** Kerr, R. P. *"Gravitational Field of a Spinning Mass"* ([Phys. Rev. Lett. 11, 237](https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.11.237)).
* **ISCO e Órbitas em Kerr (1972):** Bardeen, J. M., Press, W. H., & Teukolsky, S. A. *"Rotating Black Holes"* ([ApJ, 178, 347-370](https://adsabs.harvard.edu/full/1972ApJ...178..347B)).
* **Integrador Geodésico em KS (2018):** Chan, C.-k., Medeiros, L., & Ozel, F. *"GRay2: geodesic integrator in Kerr-Schild coordinates"* ([ApJ 867 59](https://iopscience.iop.org/article/10.3847/1538-4357/aae4dd)).
* **Formulação Hamiltoniana Conservativa (2018):** Bacchini, F., Ripperda, B., & Chen, A. Y. *"Conservative Hamiltonian formulation for general relativistic geodesics"* ([ApJS 237 6](https://iopscience.iop.org/article/10.3847/1538-4365/aac88f)).
* **Disco de Acreção Novikov-Thorne (1973):** Novikov, I. D., & Thorne, K. S. *"Astrophysics of black holes"* in Black Holes (Les Astres Occlus), 343-450.
* **Temperatura de Cor Tanner-Helland:** Tanner Helland's *"How to Convert Temperature (K) to RGB"* ([TannerHelland.com](https://tannerhelland.com/2012/10/26/color-temperature-rgb.html)).

---

## 10. Instalação e Execução

### Requisitos
- **Node.js** (versão 14 ou superior)
- Um **Navegador Moderno** com suporte a WebGL 1.0 / 2.0 (Chrome, Firefox, Safari, Edge).

### Execução Local
1. Clone o repositório e entre na pasta:
   ```bash
   git clone https://github.com/zlkingado/blackhole-simulator-js.git
   cd blackhole-simulator-js
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor da aplicação:
   ```bash
   npm start
   ```
4. Acesse no seu navegador: **`http://localhost:3000`** (ou abra `public/index.html` diretamente).

---

## 📜 Licença (MIT)

Este projeto possui código aberto sob a **Licença MIT**. Veja o arquivo `LICENSE` para mais detalhes.
