*Read this in other languages: [English](README.md), [Português](README_pt.md).*

# 🌌 Gargantua: Relativistic Kerr Black Hole Simulator

> An interactive **Rotating Black Hole (Kerr)** simulator, running 100% in the browser. Developed in **HTML5, Javascript, and WebGL (Fragment Shader)**, it performs reverse ray tracing by numerically solving photon null geodesics in curved Kerr spacetime.

The simulation incorporates full Kerr geodesics using a conservative Hamiltonian formulation in Kerr-Schild coordinates, metric-gradient adaptive RK4 numerical integration, a 3D volumetric accretion disk with Novikov-Thorne thermodynamics, Kerr photon spheres with Einstein ring visualization, Relativistic Doppler Beaming, Gravitational Redshift, GPU Physical Depth-of-Field (Bokeh DoF), Filmic ACES Tone Mapping, and Supersampling Antialiasing (SSAA 2x).

> **Disclaimer:** This is an independent hobby project built out of passion for astrophysics and general relativity. The codebase incorporates theoretical equations (Bardeen 1972, Teo 2003, Chan 2018, Bacchini 2018) alongside real-time GPU numerical optimizations and perceptual visual scaling.

---

## 📸 Preview

<p align="center">
  <img src="image.png" alt="Gargantua Black Hole">
  <br>
  <i>Real-time GPU rendering of the supermassive Kerr black hole.</i>
</p>

---

## Table of Contents
1. [Rendering Methodology (Reverse Ray Tracing)](#1-rendering-methodology-reverse-ray-tracing)
2. [Kerr-Schild Spacetime Geometry](#2-kerr-schild-spacetime-geometry)
3. [Integration of Relativistic Geodesics (Conservative Hamiltonian RK4 with Metric-Gradient Step Size)](#3-integration-of-relativistic-geodesics-conservative-hamiltonian-rk4-with-metric-gradient-step-size)
4. [Gravitomagnetic Frame Dragging & ZAMO Plunge Motion](#4-gravitomagnetic-frame-dragging--zamo-plunge-motion)
5. [Volumetric Accretion Disk Physics](#5-volumetric-accretion-disk-physics)
   - [Normalized Novikov-Thorne Thermal Profile](#51-normalized-novikov-thorne-thermal-profile)
   - [3D Volumetric Gas Modeling (Beer-Lambert Law)](#52-3d-volumetric-gas-modeling-beer-lambert-law)
   - [Combined Relativistic Redshift & Covariant Doppler Beaming](#53-combined-relativistic-redshift--covariant-doppler-beaming)
6. [Visual Guide: Exact Kerr Photon Sphere (Bardeen 1972 / Teo 2003)](#6-visual-guide-exact-kerr-photon-sphere-bardeen-1972--teo-2003)
7. [Physical GPU Depth-of-Field (Bokeh Lens Aperture)](#7-physical-gpu-depth-of-field-bokeh-lens-aperture)
8. [Filmic Tone Mapping & Supersampling Antialiasing (SSAA 2x)](#8-filmic-tone-mapping--supersampling-antialiasing-ssaa-2x)
9. [Scientific References](#9-scientific-references)
10. [Installation and Execution](#10-installation-and-execution)

---

## 1. Rendering Methodology (Reverse Ray Tracing)

To achieve 60 FPS performance directly in the browser, the simulator uses **Reverse Ray Tracing** inside a WebGL *Fragment Shader*.

Instead of simulating photons emitted from the accretion disk in all random directions (where only a tiny fraction would strike the camera), photons are integrated **backwards** in time from the camera lens (observer) towards the black hole.

For each screen pixel:
1. Normalized 2D screen coordinates are mapped to a 3D initial photon ray direction $\mathbf{n}$.
2. The initial photon canonical momentum vector $\mathbf{p}$ is computed at the observer's position matching the local Kerr-Schild metric tensor $f(r, \theta)$ and incoming direction vector $\mathbf{l}$.
3. The null geodesic trajectory is numerically integrated step-by-step using 4th-Order Runge-Kutta (RK4) with metric-gradient adaptive stepping.
4. As the photon steps through space, it accumulates emission brightness and opacity from the 3D accretion disk according to Beer-Lambert's law.
5. If the photon enters the outer event horizon ($r_{\text{eff}} \le r_+ = M + \sqrt{M^2 - a^2}$), integration stops immediately and the ray is marked as absorbed (black hole shadow).
6. If the photon escapes to radial distances exceeding the dynamic escape boundary ($R^2 > R_{\text{escape}}^2$), the final ray momentum vector is used to sample the procedural background starfield and galactic nebula.

---

## 2. Kerr-Schild Spacetime Geometry

A rotating black hole with gravitational mass $M$ and spin $J$ is described by the Kerr metric. The dimensionless spin parameter $a = J/M$ ($0 \le a < 1$) governs spacetime rotation and frame dragging.

In Kerr-Schild Cartesian coordinates $(x,y,z)$, the metric tensor is decomposed into flat Minkowski space plus a scalar metric factor $f(r, \theta)$ and an outgoing null vector $l_\mu$:

$$g_{\mu\nu} = \eta_{\mu\nu} + f l_\mu l_\nu$$

where:

$$f(r, \theta) = \frac{2 M r^3}{r^4 + a^2 z^2}$$

$$l_\mu = \left(1, \frac{r x + a y}{r^2 + a^2}, \frac{r y - a x}{r^2 + a^2}, \frac{z}{r}\right)$$

The physical Kerr radial distance $r$ is solved from oblate spherical coordinates:

$$\frac{x^2 + y^2}{r^2 + a^2} + \frac{z^2}{r^2} = 1$$

yielding the exact quadratic root:

$$r^2 = \frac{1}{2}\left(R^2 - a^2\right) + \frac{1}{2}\sqrt{\left(R^2 - a^2\right)^2 + 4 a^2 z^2}$$

where $R^2 = x^2 + y^2 + z^2$. The outer event horizon radius $r_+$ is located at:

$$r_+ = M + \sqrt{M^2 - a^2}$$

---

## 3. Integration of Relativistic Geodesics (Conservative Hamiltonian RK4 with Metric-Gradient Step Size)

Photons travel along null geodesics ($ds^2 = 0$). The simulator uses the **Conservative Hamiltonian Formulation** (Chan, Medeiros & Ozel 2018; Bacchini et al. 2018) in Kerr-Schild coordinates to compute equations of motion for position $\mathbf{x}$ and momentum $\mathbf{p}$:

$$\frac{d\mathbf{x}}{d\lambda} = \mathbf{p} - f \mathbf{l} V$$

$$\frac{d\mathbf{p}}{d\lambda} = \frac{1}{2} V^2 \nabla f + f V (\mathbf{p} \cdot \nabla \mathbf{l})$$

where $V = (\mathbf{p} \cdot \mathbf{l}) - 1$.

Integration is performed using the **4th-Order Runge-Kutta Method (RK4)** with a **Metric-Gradient Adaptive Step Size**:

$$dt_{\text{local}} = dt_{\text{base}} \cdot \frac{\text{clamp}(r / 1.5, 0.25, 40.0)}{1 + 1.2 \|\nabla f\|}$$

This dynamically refines numerical precision near strong curvature gradients ($\|\nabla f\|$) and near the horizon ($r \to r_+$), while preventing horizon penetration artifacts via double-layer fall-through protection.

---

## 4. Gravitomagnetic Frame Dragging & ZAMO Plunge Motion

When the black hole rotates ($a > 0$), spacetime itself is dragged around the central axis (Lense-Thirring effect).

1. **Geodesic Dragging:** The metric derivative terms $\nabla f$ and $\nabla \mathbf{l}$ in the Hamiltonian equations naturally drag light trajectories in the direction of spin. A unified effective spin parameter $a_{\text{geo}}$ (set to $a$ when Frame Dragging is active and $0.0$ when inactive) guarantees strict physical consistency between photon curvature and accretion disk orbital motion.
2. **Plunge Region Velocity Blending:** Plasma inside the ISCO ($r < r_{\text{isco}}$) no longer maintains stable Keplerian orbits. The orbital angular velocity $\Omega_K$ is smoothly blended from Keplerian velocity at ISCO ($\Omega_{\text{isco}}$) to ZAMO (Zero Angular Momentum Observer) frame dragging velocity ($\Omega_{\text{zamo}} = -g_{t\phi}/g_{\phi\phi}$) at the event horizon:

$$\Omega_K(r) = \text{mix}\left(\Omega_{\text{zamo}}, \Omega_{\text{isco}}, \text{smoothstep}(r_+, r_{\text{isco}}, r)\right)$$

---

## 5. Volumetric Accretion Disk Physics

### 5.1 Normalized Novikov-Thorne Thermal Profile
Equatorial matter orbits outside the Innermost Stable Circular Orbit (ISCO). The prograde ISCO radius $r_{\text{isco}}$ is computed using Bardeen et al. (1972) equations with native `Math.cbrt` precision:

$$r_{\text{isco}} = M \left( 3 + x_2 - \sqrt{(3-x_1)(3+x_1+2x_2)} \right)$$

$$x_1 = 1 + \sqrt[3]{1 - a^2} \left( \sqrt[3]{1+a} + \sqrt[3]{1-a} \right)$$

$$x_2 = \sqrt{3 a^2 + x_1^2}$$

Plasma temperature follows the **Novikov-Thorne** relativistic thin-disk profile (1973):

$$T(r) = T_{\text{peak}} \cdot \left(\frac{r_{\text{isco}}}{r}\right)^{0.75} \cdot \left(1 - \sqrt{\frac{r_{\text{isco}}}{r}}\right)^{0.25} \cdot 2.2$$

### 5.2 3D Volumetric Gas Modeling (Beer-Lambert Law)
The gas disk has a 3D Gaussian vertical decay and exponential radial density profile with multi-scale turbulence noise:

$$\rho(r, z) = e^{-0.10(r - r_{\text{isco}})} \cdot e^{-\frac{z^2}{0.08}} \cdot \text{Noise}_{3D}\left(\mathbf{p}_{\text{rot}}\right)$$

Volumetric ray marching accumulates opacity and emission over step distance $dt$ using **Beer-Lambert's Law** ($k_{\text{opacity}} = 6.0$):

$$\Delta \alpha = 1 - e^{-\rho \cdot dt \cdot k_{\text{opacity}}}$$

$$\mathbf{I}_{\text{accum}} = \mathbf{I}_{\text{accum}} + (1 - \alpha_{\text{accum}}) \cdot \mathbf{C}_{\text{emission}} \cdot \Delta \alpha$$

### 5.3 Combined Relativistic Redshift & Covariant Doppler Beaming
1. **Gravitational & Kinematic Redshift ($g_{\text{grav}}$):**

$$g_{\text{grav}} = \frac{g_{\text{obs}}}{u^t_{\text{disc}}}$$

where $u^t_{\text{disc}} = 1/\sqrt{-(g_{tt} + 2 \Omega_K g_{t\phi} + \Omega_K^2 g_{\phi\phi})}$.

2. **Doppler Beaming ($g_{\text{doppler}}$):**

$$g_{\text{doppler}} = \frac{1}{\max(0.25, 1 - \Omega_K L_z)}$$

where $L_z = x p_y - y p_x$ is the conserved photon Killing axial angular momentum.

Observed plasma temperature $T_{\text{obs}} = g_{\text{factor}} \cdot T(r)$ is mapped to RGB blackbody color via the Tanner Helland algorithm with perceptual luminosity scaling for real-time WebGL dynamic range.

---

## 6. Visual Guide: Exact Kerr Photon Sphere (Bardeen 1972 / Teo 2003)

When toggled on, a 3D wireframe shell highlights the exact prograde spherical photon orbit radius derived by Bardeen et al. (1972) and Teo (2003):

$$r_{\text{photon}} = 2 M \left(1 + \cos\left(\frac{2}{3} \arccos(-a_{\text{geo}} / M)\right)\right)$$

For Schwarzschild ($a=0$), $r_{\text{photon}} = 3M$. For maximum Kerr ($a=0.99M$), $r_{\text{photon}}$ shrinks smoothly to $1.17M$.

---

## 7. Physical GPU Depth-of-Field (Bokeh Lens Aperture)

Instead of a flat 2D CSS post-processing blur, the simulator incorporates a **Physical Thin-Lens Aperture Model** running directly inside the GPU ray tracer.

When DoF is enabled:
1. The ray origin is perturbed on the camera lens plane using uniform disk distribution:

$$\mathbf{P}_{\text{lens}} = \mathbf{P}_{\text{cam}} + r_{\text{aperture}} (\cos\theta \, \mathbf{R} + \sin\theta \, \mathbf{U})$$

2. The ray direction is re-aimed towards the focus target point at distance $D_{\text{focus}} = \|\mathbf{P}_{\text{cam}}\|$.
3. Subpixel sampling during SSAA 2x naturally acts as a zero-cost Monte Carlo denoiser for the optical bokeh blur.

---

## 8. Filmic Tone Mapping & Supersampling Antialiasing (SSAA 2x)

### 8.1 Filmic ACES Exposure Tone Mapping
To prevent white clipping on Doppler-boosted regions while preserving dark reddish blackbody gradients, the shader uses filmic exposure tone mapping:

$$\mathbf{I}_{\text{screen}} = \left(1 - e^{-\mathbf{I}_{\text{accum}} \cdot 1.1}\right)^{\frac{1}{2.2}}$$

### 8.2 Supersampling Antialiasing (SSAA 2x)
When active, samples 4 sub-pixel locations in a rotated grid pattern per pixel:

$$\mathbf{I}_{\text{final}} = \frac{1}{4} \sum_{s=1}^{4} \mathbf{I}\left(\mathbf{p}_s\right)$$

---

## 9. Scientific References

* **Kerr Metric (1963):** Kerr, R. P. *"Gravitational Field of a Spinning Mass"* ([Phys. Rev. Lett. 11, 237](https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.11.237)).
* **ISCO & Orbits in Kerr (1972):** Bardeen, J. M., Press, W. H., & Teukolsky, S. A. *"Rotating Black Holes"* ([ApJ, 178, 347-370](https://adsabs.harvard.edu/full/1972ApJ...178..347B)).
* **Spherical Photon Orbits in Kerr Spacetime (2003):** Teo, E. *"Spherical Photon Orbits in the Kerr Spacetime"* ([General Relativity and Gravitation 35, 1909-1926](https://doi.org/10.1023/A:1026286607562)).
* **Geodesic Integrator in KS (2018):** Chan, C.-k., Medeiros, L., & Ozel, F. *"GRay2: geodesic integrator in Kerr-Schild coordinates"* ([ApJ 867 59](https://iopscience.iop.org/article/10.3847/1538-4357/aae4dd)).
* **Conservative Hamiltonian Geodesics (2018):** Bacchini, F., Ripperda, B., & Chen, A. Y. *"Conservative Hamiltonian formulation for general relativistic geodesics"* ([ApJS 237 6](https://iopscience.iop.org/article/10.3847/1538-4365/aac88f)).
* **Novikov-Thorne Accretion Disk (1973):** Novikov, I. D., & Thorne, K. S. *"Astrophysics of black holes"* in Black Holes (Les Astres Occlus), 343-450.
* **Tanner-Helland Color Temperature:** Tanner Helland's *"How to Convert Temperature (K) to RGB"* ([TannerHelland.com](https://tannerhelland.com/2012/10/26/color-temperature-rgb.html)).

---

## 10. Installation and Execution

### Requirements
- **Node.js** (version 14 or higher)
- A **Modern Browser** supporting WebGL 1.0 / 2.0 (Chrome, Firefox, Safari, Edge).

### Local Execution
1. Clone the repository and enter the directory:
   ```bash
   git clone https://github.com/zlkingado/blackhole-simulator-js.git
   cd blackhole-simulator-js
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application server:
   ```bash
   npm start
   ```
4. Open your browser at **`http://localhost:3000`** (or open `public/index.html` directly).

---

## 📜 License (MIT)

This project is open-source and licensed under the **MIT License**. See `LICENSE` for details.
