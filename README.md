*Read this in other languages: [English](README.md), [Português](README_pt.md).*

# 🌌 Gargantua: Relativistic Kerr Black Hole Simulator

> An interactive **Rotating Black Hole (Kerr)** simulator, running 100% in the browser. Developed in **HTML5, Javascript, and WebGL (Fragment Shader)**, it performs ray tracing by numerically solving photon geodesics in curved spacetime.

The simulation incorporates complete Kerr geodesics using a Hamiltonian formulation, high-precision RK4 numerical integration, a volumetric accretion disk (with real thermodynamic physics), Kerr photon spheres with Einstein rings, Relativistic Beaming, and supersampling antialiasing (SSAA 2x).

> **Disclaimer:** This is an independent hobby project. I am not an academic physicist or an expert software engineer. The code was built out of passion for astronomy, but it may contain physical approximations, numerical limitations, or bugs. Modify and study at your own risk!

---

## 📸 Preview

<p align="center">
  <img src="image.png" alt="Gargantua Black Hole">
  <br>
  <i>Real-time GPU rendering of the supermassive black hole.</i>
</p>

---

## Table of Contents
1. [Rendering Methodology (Reverse Ray Tracing)](#1-rendering-methodology-reverse-ray-tracing)
2. [Kerr-Schild Spacetime Geometry](#2-kerr-schild-spacetime-geometry)
3. [Integration of Relativistic Geodesics (Adaptive RK4)](#3-integration-of-relativistic-geodesics-adaptive-rk4)
4. [Gravitomagnetic Frame Dragging](#4-gravitomagnetic-frame-dragging)
5. [Volumetric Accretion Disk Physics](#5-volumetric-accretion-disk-physics)
   - [Normalized Novikov-Thorne Thermal Profile](#51-normalized-novikov-thorne-thermal-profile)
   - [3D Volumetric Gas Modeling (Beer-Lambert Law)](#52-3d-volumetric-gas-modeling-beer-lambert-law)
   - [Stefan-Boltzmann Luminosity and Relativistic Beaming](#53-stefan-boltzmann-luminosity-and-relativistic-beaming)
6. [Visual Guide: Dynamic Kerr Photon Sphere](#6-visual-guide-dynamic-kerr-photon-sphere)
7. [GPU Optimizations and Thermal Limitations](#7-gpu-optimizations-and-thermal-limitations)
8. [EHT Blur Filter and Antialiasing (SSAA 2x)](#8-eht-blur-filter-and-antialiasing-ssaa-2x)
9. [Scientific References](#9-scientific-references)
10. [Installation and Execution](#10-installation-and-execution)

---

## 1. Rendering Methodology (Reverse Ray Tracing)

To achieve 60 FPS performance directly in the browser, the simulator uses **Reverse Ray Tracing** in the *Fragment Shader*. 

Instead of simulating rays emitting from the accretion disk in all directions (which would result in a tiny fraction of photons actually hitting the camera), photons are integrated **backwards** in time, starting from the camera lens (observer) towards the black hole.
For each screen pixel:
1. The 2D normalized screen coordinates are mapped to a 3D initial photon direction vector in flat space.
2. The photon geodesic is numerically integrated.
3. As the photon travels, it accumulates brightness and opacity from the volumetric disk and can intersect the geometric grid of the photon sphere.
4. If the photon enters the event horizon ($r < r_+$), the integration stops and the pixel is painted black (the black hole's shadow).
5. If the photon escapes to infinity ($R^2 > R_{escape}^2$), the final velocity vector is used to sample the procedural background stars and nebula dust.

---

## 2. Kerr-Schild Spacetime Geometry

A rotating black hole with mass $M$ and angular momentum $J$ is mathematically described by the Kerr metric. The dimensionless spin parameter $a = J/M$ ($0 \le a < 1$) determines the oblateness of the spacetime.

The physical equations are computed using Boyer-Lindquist oblate coordinates. The inverse mapping from Cartesian coordinates $(x,y,z)$ to the physical Kerr radial distance $r$ is found by solving the oblate equation:
$$\frac{x^2+y^2}{r^2+a^2} + \frac{z^2}{r^2} = 1$$

This yields the real quadratic solution for $r^2$:
$$r^2 = \frac{1}{2}(R^2 - a^2) + \frac{1}{2}\sqrt{(R^2 - a^2)^2 + 4a^2z^2}$$
where $R^2 = x^2 + y^2 + z^2$. The outer event horizon is located at the outer root of the horizon function $\Delta(r) = 0$:
$$r_+ = M + \sqrt{M^2 - a^2}$$

---

## 3. Integration of Relativistic Geodesics (Adaptive RK4)

Photons follow trajectories called null geodesics ($ds^2 = 0$). The simulator integrates the full geodesic acceleration of the spacetime in Kerr-Schild Cartesian coordinates, solved by the **4th-Order Runge-Kutta Method (RK4)**.

RK4 evaluates the geodesic acceleration four times per integration step to achieve superior high-order numerical and physical stability:
- $k_1 = f(pos, vel)$
- $k_2 = f(pos + \frac{dt}{2} k_1, vel + \frac{dt}{2} k_1)$
- $k_3 = f(pos + \frac{dt}{2} k_2, vel + \frac{dt}{2} k_2)$
- $k_4 = f(pos + dt \cdot k_3, vel + dt \cdot k_3)$
- $pos_{next} = pos + \frac{dt}{6} (k_{1,pos} + 2k_{2,pos} + 2k_{3,pos} + k_{4,pos})$

The integration time step is adaptive, shrinking near the horizon and expanding in weak-field regions:
$$dt_{local} = dt \cdot \text{clamp}\left(\frac{r}{3.0}, 0.15, 20.0\right)$$

*Note: The upper limit of the adaptive step has been increased to $20.0M$. This allows the camera to zoom out up to $80.0M$ without the black hole disappearing, by dynamically adjusting the escape radius to:*
$$R_{escape}^2 = \max(700.0, 1.5 \cdot |\mathbf{x}_{camera}|^2)$$

---

## 4. Gravitomagnetic Frame Dragging

The black hole's spin drags the very fabric of spacetime around it (Lense-Thirring effect). In the simulator, the frame dragging effect is integrated **directly into the differential trajectory equations** as a Coriolis-like gravitomagnetic acceleration acting on the photon's velocity:
$$\mathbf{a}_{total} = \mathbf{a}_{schwarzschild} + \mathbf{a}_{dragging}$$

The central acceleration and the gravitomagnetic dragging term in equivalent Cartesian coordinates are formulated as:
$$\mathbf{a}_{dragging} = \frac{2 M a}{r^3} \left[ 3 \frac{(\mathbf{x} \cdot \mathbf{v})}{r^2} (\mathbf{x} \times \mathbf{k}) - (\mathbf{v} \times \mathbf{k}) \right]$$
where:
- $\mathbf{x}$ is the position, $\mathbf{v}$ is the photon velocity.
- $\mathbf{k} = (0, 0, 1)$ is the unit vector of the spin $z$-axis.

This causes the photon beam to be continuously pulled along throughout the entire RK4 integration, asymmetrically warping the central shadow of the event horizon.

---

## 5. Volumetric Accretion Disk Physics

### 5.1 Normalized Novikov-Thorne Thermal Profile
The matter in the accretion disk orbits in the equatorial plane in stable Keplerian orbits. The inner stable boundary of the disk is located at the Innermost Stable Circular Orbit (ISCO) described by Bardeen:
$$r_{ISCO} = M \left( 3 + x_2 - \sqrt{(3-x_1)(3+x_1+2x_2)} \right)$$
where:
$$x_1 = 1 + (1 - a^2)^{1/3} \left( (1+a)^{1/3} + (1-a)^{1/3} \right)$$
$$x_2 = \sqrt{3a^2 + x_1^2}$$

The physical temperature $T(r)$ of the plasma disk follows the relativistic Novikov-Thorne model (1973):
$$T(r) = T_{peak} \cdot \left(\frac{r_{ISCO}}{r}\right)^{0.75} \cdot \left(1 - \sqrt{\frac{r_{ISCO}}{r}}\right)^{0.25} \cdot 2.1$$
*(The scale factor $2.1$ normalizes the curve so that the actual maximum temperature reaches exactly the limit value $T_{peak}$ of the UI slider).*

### 5.2 3D Volumetric Gas Modeling (Beer-Lambert Law)
The accretion disk has realistic exponential radial and vertical decay. The local volumetric plasma density $\rho(r, z)$ is modeled by:
$$\rho(r, z) = e^{-0.15(r - r_{ISCO})} \cdot e^{-\frac{z^2}{0.06}} \cdot \text{Pattern}(r, \phi, z, t)$$

The rotating three-dimensional turbulence $\text{Pattern}$ is generated via 3D procedural noise on the GPU:
$$\text{Pattern} = 0.4 + 0.6 \cdot \text{Noise}_{3D}(r, \phi_{sheared}, z)$$
Where $\phi_{sheared} = \phi - 3\Omega_K t$ applies the orbital frame dragging over the texture and $\Omega_K = \frac{\sqrt{M}}{r^{1.5} + a\sqrt{M}}$ is the Keplerian orbital angular velocity of Kerr.

### 5.3 Stefan-Boltzmann Luminosity and Relativistic Beaming
The integrated brightness emitted by the gas follows the exact **Stefan-Boltzmann** law ($I \propto T^4$). The relativistic Doppler shift and combined redshift $g$ affects the observed intensity and color:
$$g = \frac{\nu_{obs}}{\nu_{emit}} = \frac{\sqrt{-g_{tt} - 2\Omega_K g_{t\phi} - \Omega_K^2 g_{\phi\phi}}}{1 - \Omega_K \xi}$$
where $\xi = x v_y - y v_x$ is the photon's orbital angular momentum.

The received spectral intensity scales as:
$$I_{obs} = I_{emit} \cdot g^4$$
$$T_{obs} = g \cdot T(r)$$

Volumetric rendering uses the **Beer-Lambert Law** for radiation absorption and accumulation, summing the emission ($step\_emission$) over the numerical step $dt$:
$$step\_alpha = 1 - e^{-\rho \cdot dt \cdot k}$$
$$accumCol = accumCol + (1 - accumAlpha) \cdot step\_emission$$

The final image undergoes HDR dynamic range compression (Reinhard Tonemapping) and gamma correction ($\gamma = 2.2$) for proper sRGB display, converting the black body temperature to RGB via the Tanner-Helland approximation.

---

## 6. Visual Guide: Dynamic Kerr Photon Sphere

The photon sphere is the region where gravity forces light to orbit the black hole indefinitely. In the Kerr metric, the radius of this sphere is not fixed at $3M$ but splits according to the spin $a$ and the orbital direction of light (prograde vs. retrograde).

We dynamically calculate the exact crossing radius $r_{photon}$ for each integrated ray:
$$r_{photon} = M \left( 2 + 2 \cos\left( \frac{2}{3} \arccos\left( -a \cdot \text{sign}(\xi) \right) \right) \right)$$
where $\xi = x v_y - y v_x$ indicates the photon's orbital direction.

When turning on the toggle in the interface, a fluorescent cyan mesh is drawn at the radial crossing. Due to extreme gravitational lensing, the Kerr photon sphere visually splits and is duplicated into secondary concentric Einstein rings behind the event horizon shadow.

---

## 7. GPU Optimizations and Thermal Limitations
Black Hole Raytracing (where each pixel executes non-linear differential geometry integrations up to 150 times) is highly demanding on the GPU. To prevent *overheating* on 4K displays:
1. **Numerical Resolution Capping:** Strict native resolution cap at a maximum equivalent of 1080p ($1920 \times 1080$). Larger monitors receive hardware upscaling (bi-linear canvas filtering).
2. **Equatorial Dynamic Step-size:** Integrator `dt` steps scale exponentially if the photon is in empty space, shrinking sharply near maximum curvature ($r < 2M$) or when crossing the disk plane ($z \approx 0$).

---

## 8. EHT Blur Filter and Antialiasing (SSAA 2x)

### 8.1 Lens Blur Filter (EHT Blur)
The simulator allows applying a lens blur of up to `20px` to emulate the angular resolution limit of radio telescopes like the **Event Horizon Telescope (EHT)**. Processing is GPU-accelerated via CSS filters applied only to the WebGL canvas viewport, keeping the UI interface perfectly sharp.

### 8.2 Supersampling Antialiasing (SSAA 2x)
To eliminate classic raytracing jagged edges at pixel resolutions, the simulator implements **SSAA 2x**. When active, the shader samples 4 sub-pixels in a grid pattern per pixel:
$$\mathbf{I}_{final} = \frac{1}{4} \sum_{s=1}^{4} \mathbf{I}(gl\_FragCoord + \mathbf{offset}_s)$$
This smooths edges and curves in complex geodesics with high visual fidelity.

---

## 9. Scientific References

The applied mathematics driving this simulator are drawn from primary General Relativity literature:
* **Kerr Metric (1963):** Kerr, R. P. *"Gravitational Field of a Spinning Mass as an Example of Algebraically Special Metrics"* ([Phys. Rev. Lett. 11, 237](https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.11.237)).
* **ISCO Orbits and Photon Sphere (1972):** Bardeen, J. M., Press, W. H., & Teukolsky, S. A. *"Rotating Black Holes: Locally Nonrotating Frames, Energy Extraction, and Scalar Synchrotron Radiation"* ([ApJ, 178, 347-370](https://adsabs.harvard.edu/full/1972ApJ...178..347B)).
* **Disk Thermal Profile (1973):** Novikov, I. D., & Thorne, K. S. *"Astrophysics of black holes."* in Black Holes (Les Astres Occlus), 343-450 ([ADS](https://ui.adsabs.harvard.edu/abs/1973blho.conf..343N)).
* **Luminosity and Beaming (Luminosity from accretion disks):** Page, D. N., & Thorne, K. S. (1974). *"Disk-Accretion onto a Black Hole. Time-Averaged Structure"* ([ApJ, 191, 499-506](https://adsabs.harvard.edu/full/1974ApJ...191..499P)).
* **Tanner-Helland Black Body Formula:** Tanner Helland's *"How to Convert Temperature (K) to RGB: Algorithm and Sample Code"* ([TannerHelland.com](https://tannerhelland.com/2012/10/26/color-temperature-rgb.html)).

---

## 10. Installation and Execution

### Requirements
- **Node.js** (version 14 or higher)
- A **Modern Browser** with WebGL 1.0 or 2.0 support (Chrome, Firefox, Safari, Edge).

### Local Execution
1. Clone the repository and enter the folder:
   ```bash
   git clone https://github.com/zlkingado/blackhole-simulator-js.git
   cd blackhole-simulator-js
   ```
2. Install dependencies (Express):
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Access: **`http://localhost:3000`** (or open `public/index.html` directly in the browser offline).

---

## 📜 License (MIT)

This project is licensed under the **MIT License**. 
Feel free to use, study, modify, and distribute the code, as long as you keep the appropriate credits (see the `LICENSE` file for more details).
