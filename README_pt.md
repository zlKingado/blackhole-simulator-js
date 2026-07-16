*Read this in other languages: [English](README.md), [Português](README_pt.md).*

# 🌌 Gargantua: Relativistic Kerr Black Hole Simulator

> Um simulador interativo de **Buraco Negro Rotativo (Kerr)**, rodando 100% no navegador. Desenvolvido em **HTML5, Javascript e WebGL (Fragment Shader)**, ele realiza o traçado de raios (ray tracing) resolvendo numericamente as geodésicas de fótons no espaço-tempo curvo.

A simulação incorpora geodésicas completas de Kerr usando formulação hamiltoniana, integrador numérico RK4 de alta precisão, disco de acreção volumétrico (física termodinâmica real), esferas de fótons de Kerr com anéis de Einstein, Beaming Relativístico e antialiasing supersampling (SSAA 2x).

> **Aviso:** Este é um projeto de hobby independente. Não sou físico acadêmico ou engenheiro de software especialista. O código foi feito com paixão pela astronomia, mas pode conter aproximações físicas, limitações numéricas ou eventuais bugs. Modifique e estude por sua conta e risco!

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
3. [Integração das Geodésicas Relativísticas (RK4 Adaptativo)](#3-integracao-das-geodesicas-relativisticas-rk4-adaptativo)
4. [Arrasto de Referencial (Frame Dragging Gravitomagnético)](#4-arrasto-de-referencial-frame-dragging-gravitomagnetico)
5. [Física do Disco de Acreção Volumétrico](#5-fisica-do-disco-de-acrecao-volumetrico)
   - [Perfil Térmico de Novikov-Thorne Normalizado](#51-perfil-termico-de-novikov-thorne-normalizado)
   - [Modelagem Volumétrica 3D do Gás (Lei de Beer-Lambert)](#52-modelagem-volumetrica-3d-do-gas-lei-de-beer-lambert)
   - [Luminosidade de Stefan-Boltzmann e Beaming Relativístico](#53-luminosidade-de-stefan-boltzmann-e-beaming-relativistico)
6. [Guia Visual: Esfera de Fótons Dinâmica de Kerr](#6-guia-visual-esfera-de-fotons-dinamica-de-kerr)
7. [Otimizações de GPU e Limitações Térmicas](#7-otimizacoes-de-gpu-e-limitacoes-termicas)
8. [Filtro de Borrão EHT e Antialiasing (SSAA 2x)](#8-filtro-de-borrao-eht-e-antialiasing-ssaa-2x)
9. [Referências Científicas](#9-referencias-cientificas)
10. [Instalação e Execução](#10-instalacao-e-execucao)

---

## 1. Metodologia de Renderização (Ray Tracing Reverso)

Para obter um desempenho de 60 FPS direto no navegador, o simulador utiliza **Ray Tracing Reverso** no *Fragment Shader*. 

Em vez de simular raios saindo do disco de acreção em todas as direções (o que resultaria em uma fração minúscula de fótons atingindo a câmera), os fótons são integrados de **trás para frente** no tempo, partindo da lente da câmera (observador) em direção ao buraco negro.
Para cada pixel da tela:
1. As coordenadas normalizadas da tela de duas dimensões são mapeadas para um vetor tridimensional de direção inicial do fóton no espaço plano.
2. A geodésica do fóton é integrada numericamente.
3. À medida que o fóton caminha, ele acumula brilho e opacidade do disco volumétrico e pode interceptar a grade geométrica da esfera de fótons.
4. Se o fóton entra no horizonte de eventos ($r < r_+$), a integração cessa e o pixel é pintado de preto (sombra do buraco negro).
5. Se o fóton escapa para o infinito ($R^2 > R_{escape}^2$), o vetor final de velocidade é usado para amostrar o fundo de estrelas procedurais e poeira nebulosa.

---

## 2. Geometria do Espaço-Tempo de Kerr-Schild

Um buraco negro rotativo com massa $M$ e momento angular $J$ é descrito matematicamente pela métrica de Kerr. O parâmetro de spin adimensional $a = J/M$ ($0 \le a < 1$) determina o achatamento do espaço-tempo.

As equações físicas são calculadas utilizando coordenadas oblatas de Boyer-Lindquist. A correspondência inversa de coordenadas Cartesianas $(x,y,z)$ para a distância radial física $r$ de Kerr é dada resolvendo a equação oblata:
$$\frac{x^2+y^2}{r^2+a^2} + \frac{z^2}{r^2} = 1$$

Isso resulta na solução quadrática real para $r^2$:
$$r^2 = \frac{1}{2}(R^2 - a^2) + \frac{1}{2}\sqrt{(R^2 - a^2)^2 + 4a^2z^2}$$
onde $R^2 = x^2 + y^2 + z^2$. O horizonte de eventos externo localiza-se na raiz externa da função de horizonte $\Delta(r) = 0$:
$$r_+ = M + \sqrt{M^2 - a^2}$$

---

## 3. Integração das Geodésicas Relativísticas (RK4 Adaptativo)

Fótons seguem trajetórias chamadas geodésicas nulas ($ds^2 = 0$). O simulador integra a aceleração geodésica completa do espaço-tempo em coordenadas cartesianas de Kerr-Schild, resolvida pelo **Método de Runge-Kutta de 4ª Ordem (RK4)**.

O RK4 realiza quatro avaliações da aceleração geodésica por passo de integração para obter estabilidade numérica e física superior de alta ordem:
- $k_1 = f(pos, vel)$
- $k_2 = f(pos + \frac{dt}{2} k_1, vel + \frac{dt}{2} k_1)$
- $k_3 = f(pos + \frac{dt}{2} k_2, vel + \frac{dt}{2} k_2)$
- $k_4 = f(pos + dt \cdot k_3, vel + dt \cdot k_3)$
- $pos_{next} = pos + \frac{dt}{6} (k_{1,pos} + 2k_{2,pos} + 2k_{3,pos} + k_{4,pos})$

O passo temporal de integração é adaptativo, encolhendo próximo ao horizonte e expandindo-se em regiões de campo fraco:
$$dt_{local} = dt \cdot \text{clamp}\left(\frac{r}{3.0}, 0.15, 20.0\right)$$

*Nota: O limite máximo do passo adaptativo foi aumentado para $20.0M$. Isso permite afastar a câmera (zoom out) até $80.0M$ sem que o buraco negro desapareça, ajustando dinamicamente o raio de escape para:*
$$R_{escape}^2 = \max(700.0, 1.5 \cdot |\mathbf{x}_{camera}|^2)$$

---

## 4. Arrasto de Referencial (Frame Dragging Gravitomagnético)

O spin do buraco negro arrasta o próprio tecido do espaço-tempo ao seu redor (efeito Lense-Thirring). No simulador, o efeito de frame dragging é integrado **diretamente nas equações diferenciais de trajetória** como uma aceleração gravitomagnética de Coriolis atuando sobre a velocidade do fóton:
$$\mathbf{a}_{total} = \mathbf{a}_{schwarzschild} + \mathbf{a}_{dragging}$$

A aceleração central e o termo de arraste gravitomagnético em coordenadas Cartesianas equivalentes são formulados por:
$$\mathbf{a}_{dragging} = \frac{2 M a}{r^3} \left[ 3 \frac{(\mathbf{x} \cdot \mathbf{v})}{r^2} (\mathbf{x} \times \mathbf{k}) - (\mathbf{v} \times \mathbf{k}) \right]$$
onde:
- $\mathbf{x}$ é a posição, $\mathbf{v}$ é a velocidade do fóton.
- $\mathbf{k} = (0, 0, 1)$ é o vetor unitário do eixo de spin $z$.

Isso faz com que o feixe de fótons seja puxado continuamente ao longo de toda a integração RK4, deformando assimetricamente a sombra central do horizonte de eventos.

---

## 5. Física do Disco de Acreção Volumétrico

### 5.1 Perfil Térmico de Novikov-Thorne Normalizado
A matéria no disco de acreção orbita no plano equatorial em órbitas estáveis Keplerianas. O limite interno estável do disco localiza-se na órbita circular estável mais interna (ISCO) de Bardeen:
$$r_{ISCO} = M \left( 3 + x_2 - \sqrt{(3-x_1)(3+x_1+2x_2)} \right)$$
onde:
$$x_1 = 1 + (1 - a^2)^{1/3} \left( (1+a)^{1/3} + (1-a)^{1/3} \right)$$
$$x_2 = \sqrt{3a^2 + x_1^2}$$

A temperatura física $T(r)$ do disco de plasma segue o modelo relativístico de Novikov-Thorne (1973):
$$T(r) = T_{pico} \cdot \left(\frac{r_{ISCO}}{r}\right)^{0.75} \cdot \left(1 - \sqrt{\frac{r_{ISCO}}{r}}\right)^{0.25} \cdot 2.1$$
*(O fator de escala $2.1$ normaliza a curva para que a temperatura máxima real atinja exatamente o valor limite $T_{pico}$ do slider).*

### 5.2 Modelagem Volumétrica 3D do Gás (Lei de Beer-Lambert)
O disco de acreção possui decaimento exponencial vertical e radial realístico. A densidade volumétrica local de plasma $\rho(r, z)$ é modelada por:
$$\rho(r, z) = e^{-0.15(r - r_{ISCO})} \cdot e^{-\frac{z^2}{0.06}} \cdot \text{Pattern}(r, \phi, z, t)$$

A turbulência tridimensional rotativa $\text{Pattern}$ é gerada via ruído procedural 3D na GPU:
$$\text{Pattern} = 0.4 + 0.6 \cdot \text{Noise}_{3D}(r, \phi_{sheared}, z)$$
Onde $\phi_{sheared} = \phi - 3\Omega_K t$ aplica o arrasto orbital sobre a textura e $\Omega_K = \frac{\sqrt{M}}{r^{1.5} + a\sqrt{M}}$ é a velocidade angular orbital kepleriana de Kerr.

### 5.3 Luminosidade de Stefan-Boltzmann e Beaming Relativístico
O brilho integrado emitido pelo gás segue a lei exata de **Stefan-Boltzmann** ($I \propto T^4$). O desvio Doppler relativístico e redshift combinado $g$ afeta a intensidade e a cor observadas:
$$g = \frac{\nu_{obs}}{\nu_{emit}} = \frac{\sqrt{-g_{tt} - 2\Omega_K g_{t\phi} - \Omega_K^2 g_{\phi\phi}}}{1 - \Omega_K \xi}$$
onde $\xi = x v_y - y v_x$ é o momento angular orbital do fóton.

A intensidade espectral recebida escala como:
$$I_{obs} = I_{emit} \cdot g^4$$
$$T_{obs} = g \cdot T(r)$$

A renderização volumétrica usa a **Lei de Beer-Lambert** para absorção e acúmulo de radiação, somando a emissão ($step\_emission$) ao longo do passo numérico $dt$:
$$step\_alpha = 1 - e^{-\rho \cdot dt \cdot k}$$
$$accumCol = accumCol + (1 - accumAlpha) \cdot step\_emission$$

A imagem final sofre compressão de faixa dinâmica HDR (Reinhard Tonemapping) e correção gama ($\gamma = 2.2$) para exibição sRGB correta, convertendo a temperatura de corpo negro para RGB via aproximação de Tanner-Helland.

---

## 6. Guia Visual: Esfera de Fótons Dinâmica de Kerr

A esfera de fótons é a região onde a gravidade obriga a luz a orbitar o buraco negro indefinidamente. Na métrica de Kerr, o raio dessa esfera não é fixo em $3M$, mas se divide conforme o spin $a$ e o sentido orbital da luz (prógrada vs. retrógrada).

Calculamos dinamicamente o raio exato de cruzamento $r_{photon}$ para cada raio integrado:
$$r_{photon} = M \left( 2 + 2 \cos\left( \frac{2}{3} \arccos\left( -a \cdot \text{sign}(\xi) \right) \right) \right)$$
onde $\xi = x v_y - y v_x$ indica a direção orbital do fóton.

Ao ligar o toggle na interface, uma malha ciano fluorescente é desenhada no cruzamento radial. Devido à lente gravitacional extrema, a esfera de fótons de Kerr se divide visualmente e é duplicada em anéis de Einstein secundários concêntricos por trás da sombra do horizonte de eventos.

---

## 7. Otimizações de GPU e Limitações Térmicas
O Raytracing de Buracos Negros (onde cada pixel executa integrações de geometria diferencial não-linear até 150 vezes) exige muito da GPU. Para evitar *overheating* (superaquecimento) em telas 4K:
1. **Limitação de Resolução Numérica:** Limite estrito de resolução nativa para no máximo equivalente a 1080p ($1920 \times 1080$). Monitores maiores recebem upscaling via hardware (filtragem bi-linear do canvas).
2. **Step-size Dinâmico Equatoreal:** Os passos do integrador `dt` escalam exponencialmente se o fóton estiver vazio, reduzindo-se bruscamente perto da curvatura máxima ($r < 2M$) ou ao atravessar o plano do disco ($z \approx 0$).

---

## 8. Filtro de Borrão EHT e Antialiasing (SSAA 2x)

### 8.1 Filtro de Borrão de Lente (EHT Blur)
O simulador permite aplicar um desfoque de lente de até `20px` para emular o limite de resolução angular de radiotelescópios como o **Event Horizon Telescope (EHT)**. O processamento é acelerado por GPU via filtros CSS aplicados apenas na viewport do canvas WebGL, mantendo a interface UI totalmente nítida.

### 8.2 Supersampling Antialiasing (SSAA 2x)
Para eliminar os serrilhados clássicos de raytracing em resoluções de pixel, o simulador implementa **SSAA 2x**. Quando ativo, o shader amostra 4 sub-pixels em padrão de grade por pixel:
$$\mathbf{I}_{final} = \frac{1}{4} \sum_{s=1}^{4} \mathbf{I}(gl\_FragCoord + \mathbf{offset}_s)$$
Isso suaviza bordas e curvas em geodésicas complexas com alta fidelidade visual.

---

## 9. Referências Científicas

As matemáticas aplicadas na base lógica deste simulador são retiradas da literatura primária de Relatividade Geral:
* **Métrica de Kerr (1963):** Kerr, R. P. *"Gravitational Field of a Spinning Mass as an Example of Algebraically Special Metrics"* ([Phys. Rev. Lett. 11, 237](https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.11.237)).
* **Órbitas ISCO e Esfera de Fótons (1972):** Bardeen, J. M., Press, W. H., & Teukolsky, S. A. *"Rotating Black Holes: Locally Nonrotating Frames, Energy Extraction, and Scalar Synchrotron Radiation"* ([ApJ, 178, 347-370](https://adsabs.harvard.edu/full/1972ApJ...178..347B)).
* **Perfil Térmico do Disco (1973):** Novikov, I. D., & Thorne, K. S. *"Astrophysics of black holes."* in Black Holes (Les Astres Occlus), 343-450 ([ADS](https://ui.adsabs.harvard.edu/abs/1973blho.conf..343N)).
* **Luminosidade e Beaming (Luminosity from accretion disks):** Page, D. N., & Thorne, K. S. (1974). *"Disk-Accretion onto a Black Hole. Time-Averaged Structure"* ([ApJ, 191, 499-506](https://adsabs.harvard.edu/full/1974ApJ...191..499P)).
* **Fórmula de Tanner-Helland para Corpo Negro:** Tanner Helland's *"How to Convert Temperature (K) to RGB: Algorithm and Sample Code"* ([TannerHelland.com](https://tannerhelland.com/2012/10/26/color-temperature-rgb.html)).

---

## 10. Instalação e Execução

### Requisitos
- **Node.js** (versão 14 ou superior)
- Um **Navegador Moderno** com suporte a WebGL 1.0 ou 2.0 (Chrome, Firefox, Safari, Edge).

### Execução Local
1. Clone o repositório e acesse a pasta:
   ```bash
   git clone https://github.com/zlkingado/blackhole-simulator-js.git
   cd blackhole-simulator
   ```
2. Instale as dependências (Express):
   ```bash
   npm install
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
4. Acesse: **`http://localhost:3000`** (ou abra `public/index.html` diretamente no navegador offline).

---

## 📜 Licença (MIT)

Este projeto está sob a licença **MIT**. 
Sinta-se livre para usar, estudar, modificar e distribuir o código, contanto que mantenha os devidos créditos (veja o arquivo `LICENSE` para mais detalhes).
