// main.js
// JavaScript for Earth's Orbit Around the Sun - Interactive 3D Visualization

// Global variables
let scene, camera, renderer, controls;
let sun, earth, moon, earthOrbit;
let earthTrail = [];
let moonTrail = [];
let maxTrailPoints = 500;
let earthTrailLine, moonTrailLine;
let isPaused = false;
let speedMultiplier = 1;
let showTrails = false;
let showLabels = false;
let sunLabel, earthLabel, moonLabel;
let raycaster, mouse;

// Physics constants (properly scaled for visualization)
const G = 6.674e-11; // Gravitational constant in m³/kg/s²
const AU = 1.496e11; // Astronomical Unit in meters
const LUNAR_DISTANCE = 3.844e8; // Average Earth-Moon distance in meters

// Scale factors for visualization
const DISTANCE_SCALE = 1 / AU; // Scale distances so 1 AU = 1 unit
const DISPLAY_SCALE = 150; // Scale for 3D rendering (Earth orbit radius = 150 units)

// Physics time step (in simulation time units - seconds)
const TIME_STEP = 3600; // 1 hour per frame in simulation time
let simulationTime = 0; // Accumulated simulation time in seconds

// Orbital periods in seconds
const EARTH_PERIOD = 365.25 * 24 * 3600; // Earth's orbital period
const MOON_PERIOD = 27.3 * 24 * 3600; // Moon's orbital period

// Celestial body data (all in SI units)
const celestialBodies = {
    sun: {
        mass: 1.989e30, // kg
        position: { x: 0, y: 0, z: 0 }, // meters (scaled)
        fixed: true
    },
    earth: {
        mass: 5.972e24, // kg
        position: { x: 0, y: 0, z: 0 }, // Will be calculated analytically
        velocity: { x: 0, y: 0, z: 0 }, // Will be calculated analytically
        semiMajorAxis: 1.496e11, // meters
        eccentricity: 0.0167
    },
    moon: {
        mass: 7.342e22, // kg
        position: { x: 0, y: 0, z: 0 }, // Relative to Earth
        velocity: { x: 0, y: 0, z: 0 }, // Relative to Earth
        semiMajorAxis: 3.844e8, // meters
        eccentricity: 0.0549
    }
};

// Initialize the scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(200, 100, 200);
    camera.lookAt(0, 0, 0);
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    document.body.appendChild(renderer.domElement);
    // Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Initialize physics
    initializeOrbitalPhysics();
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);
    
    // Create celestial bodies
    createSun();
    createEarth();
    createMoon();
    
    // Set initial positions by running physics once
    updatePhysics();
    
    // Create orbital paths and trails
    createOrbitalPaths();
    createTrails();
    
    // Add stars to the background
    createStars();
    
    // Initialize raycaster for mouse interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Setup UI controls
    setupControls();
    
    // Create labels
    createLabels();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
        }, 500);
    }, 1500);
    
    // Start animation loop
    animate();
}

// Initialize orbital physics
function initializeOrbitalPhysics() {
    // Initialize simulation time
    simulationTime = 0;
    
    // Earth position will be calculated analytically - no initialization needed
    
    // Initialize Moon's relative position and velocity around Earth
    // Start Moon at apogee (farthest point from Earth) - but make it closer for visibility
    const moonDistance = celestialBodies.moon.semiMajorAxis * 0.8; // Closer than actual for better visibility
    
    // Moon starts to the right of Earth in relative coordinates
    celestialBodies.moon.position.x = moonDistance;
    celestialBodies.moon.position.y = 0;
    celestialBodies.moon.position.z = 0;
    
    // Calculate Moon's initial orbital velocity around Earth (perpendicular to position)
    // Using vis-viva equation: v = sqrt(GM(2/r - 1/a))
    const moonOrbitalSpeed = Math.sqrt(G * celestialBodies.earth.mass * 
        (2/moonDistance - 1/celestialBodies.moon.semiMajorAxis));
    
    celestialBodies.moon.velocity.x = 0;
    celestialBodies.moon.velocity.y = moonOrbitalSpeed;
    celestialBodies.moon.velocity.z = 0;
    
    console.log("Orbital physics initialized:");
    console.log("Moon relative position:", celestialBodies.moon.position);
    console.log("Moon relative velocity:", celestialBodies.moon.velocity);
    console.log("Moon orbital speed:", moonOrbitalSpeed / 1000, "km/s");
    console.log("Moon distance from Earth:", moonDistance / 1000, "km");
}

// Create the Sun
function createSun() {
    const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 1
    });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    
    // Add sun glow effect
    const sunGlow = new THREE.PointLight(0xffddaa, 3, 300);
    sun.add(sunGlow);
    
    // Add sun corona
    const coronaGeometry = new THREE.SphereGeometry(9, 32, 32);
    const coronaMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    sun.add(corona);
    
    // Add main lighting
    const sunLight = new THREE.PointLight(0xffffff, 2, 300);
    sun.add(sunLight);
}

// Create Earth
function createEarth() {
    const earthGeometry = new THREE.SphereGeometry(3, 32, 32);
    const earthMaterial = new THREE.MeshPhongMaterial({
        color: 0x2233ff,
        emissive: 0x112244,
        specular: 0x333333,
        shininess: 30
    });
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);
    
    // Add Earth clouds
    const earthClouds = new THREE.Mesh(
        new THREE.SphereGeometry(3.1, 32, 32),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3
        })
    );
    earth.add(earthClouds);
    
    // Initial position will be set by updatePhysics
    console.log("Earth created");
}

// Create Moon
function createMoon() {
    const moonGeometry = new THREE.SphereGeometry(1.5, 32, 32); // Smaller than Earth but still visible
    const moonMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, // Bright white
        emissive: 0x444444, // Strong emissive glow
    });
    moon = new THREE.Mesh(moonGeometry, moonMaterial);
    scene.add(moon);
    
    // Initial position will be set by updatePhysics
    console.log("Moon created");
}

// Create orbital paths
function createOrbitalPaths() {
    // Earth's elliptical orbit (scaled for display)
    const earthA = celestialBodies.earth.semiMajorAxis * DISTANCE_SCALE * DISPLAY_SCALE;
    const earthE = celestialBodies.earth.eccentricity;
    const earthB = earthA * Math.sqrt(1 - earthE * earthE);
    
    // Create ellipse points manually to match the analytical calculation
    const orbitPoints = [];
    for (let i = 0; i <= 200; i++) {
        const angle = (i / 200) * 2 * Math.PI;
        const r = earthA * (1 - earthE * earthE) / (1 + earthE * Math.cos(angle));
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        orbitPoints.push(new THREE.Vector3(x, y, 0));
    }
    
    const earthOrbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const earthOrbitMaterial = new THREE.LineBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.4
    });
    const earthOrbitLine = new THREE.Line(earthOrbitGeometry, earthOrbitMaterial);
    // No rotation needed since we're already in XY plane
    scene.add(earthOrbitLine);
    
    console.log("Earth orbit created with semi-major axis:", earthA, "display units");
}

// Create trails
function createTrails() {
    // Earth trail
    const earthTrailGeometry = new THREE.BufferGeometry();
    const earthTrailMaterial = new THREE.LineBasicMaterial({
        color: 0x64b5f6,
        transparent: true,
        opacity: 0.7
    });
    earthTrailLine = new THREE.Line(earthTrailGeometry, earthTrailMaterial);
    scene.add(earthTrailLine);
    earthTrailLine.visible = false;
    
    // Moon trail
    const moonTrailGeometry = new THREE.BufferGeometry();
    const moonTrailMaterial = new THREE.LineBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.5
    });
    moonTrailLine = new THREE.Line(moonTrailGeometry, moonTrailMaterial);
    scene.add(moonTrailLine);
    moonTrailLine.visible = false;
}

// Create background stars
function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1
    });
    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// Animation loop with physics simulation
function animate() {
    requestAnimationFrame(animate);
    
    if (!isPaused) {
        // Update physics simulation
        updatePhysics();
        
        // Update trails
        if (showTrails) {
            updateTrails();
        }
        
        // Update celestial body rotations
        earth.rotation.y += 0.02 * speedMultiplier; // Earth's rotation
        moon.rotation.y += 0.02 * speedMultiplier; // Moon's rotation
        
        // Update stats
        updateStats();
    }
    
    // Update controls
    controls.update();
    
    // Update labels to face camera
    if (showLabels) {
        updateLabels();
    }
    
    // Render scene
    renderer.render(scene, camera);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Update trails for both Earth and Moon
function updateTrails() {
    updateEarthTrail();
    updateMoonTrail();
}

// Update Earth trail
function updateEarthTrail() {
    const worldPosition = new THREE.Vector3();
    earth.getWorldPosition(worldPosition);
    earthTrail.push(worldPosition.clone());
    
    if (earthTrail.length > maxTrailPoints) {
        earthTrail.shift();
    }
    
    const positions = new Float32Array(earthTrail.length * 3);
    earthTrail.forEach((pos, index) => {
        positions[index * 3] = pos.x;
        positions[index * 3 + 1] = pos.y;
        positions[index * 3 + 2] = pos.z;
    });
    
    earthTrailLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    earthTrailLine.geometry.attributes.position.needsUpdate = true;
}

// Update Moon trail
function updateMoonTrail() {
    const worldPosition = new THREE.Vector3();
    moon.getWorldPosition(worldPosition);
    moonTrail.push(worldPosition.clone());
    
    if (moonTrail.length > maxTrailPoints) {
        moonTrail.shift();
    }
    
    const positions = new Float32Array(moonTrail.length * 3);
    moonTrail.forEach((pos, index) => {
        positions[index * 3] = pos.x;
        positions[index * 3 + 1] = pos.y;
        positions[index * 3 + 2] = pos.z;
    });
    
    moonTrailLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    moonTrailLine.geometry.attributes.position.needsUpdate = true;
}

// Physics simulation update
function updatePhysics() {
    const dt = TIME_STEP * speedMultiplier; // Time step in seconds
    simulationTime += dt;
    
    // Update Earth position analytically (stable elliptical orbit)
    updateEarthAnalytical();
    
    // Update Moon position using simplified dynamics (Earth gravity only)
    updateMoonPhysics(dt);
    
    // Update 3D object positions (scaled for display)
    earth.position.set(
        celestialBodies.earth.position.x * DISTANCE_SCALE * DISPLAY_SCALE,
        celestialBodies.earth.position.y * DISTANCE_SCALE * DISPLAY_SCALE,
        celestialBodies.earth.position.z * DISTANCE_SCALE * DISPLAY_SCALE
    );
    
    // Moon's absolute position = Earth position + Moon relative position (with enhanced Moon scale)
    const moonScale = 20; // Make Moon orbit 20x larger for visibility
    const moonAbsoluteX = celestialBodies.earth.position.x + (celestialBodies.moon.position.x * moonScale);
    const moonAbsoluteY = celestialBodies.earth.position.y + (celestialBodies.moon.position.y * moonScale);
    const moonAbsoluteZ = celestialBodies.earth.position.z + (celestialBodies.moon.position.z * moonScale);
    
    moon.position.set(
        moonAbsoluteX * DISTANCE_SCALE * DISPLAY_SCALE,
        moonAbsoluteY * DISTANCE_SCALE * DISPLAY_SCALE,
        moonAbsoluteZ * DISTANCE_SCALE * DISPLAY_SCALE
    );
    
    // Debug logging (remove after testing)
    if (simulationTime < 10000) { // Only log for first few seconds
        console.log("Earth pos:", earth.position);
        console.log("Moon abs pos:", moonAbsoluteX, moonAbsoluteY, moonAbsoluteZ);
        console.log("Moon display pos:", moon.position);
        console.log("Moon relative pos:", celestialBodies.moon.position);
        console.log("DISTANCE_SCALE:", DISTANCE_SCALE);
        console.log("DISPLAY_SCALE:", DISPLAY_SCALE);
    }
}

// Calculate Earth's position analytically using elliptical orbit equations
function updateEarthAnalytical() {
    // Calculate mean anomaly (M) - Earth's average angular position
    const M = (2 * Math.PI * simulationTime / EARTH_PERIOD) % (2 * Math.PI);
    
    // Solve for eccentric anomaly (E) using Newton-Raphson iteration
    // M = E - e*sin(E)
    let E = M; // Initial guess
    const e = celestialBodies.earth.eccentricity;
    
    // Newton-Raphson iterations (3-5 iterations are usually sufficient)
    for (let i = 0; i < 5; i++) {
        const f = E - e * Math.sin(E) - M;
        const fp = 1 - e * Math.cos(E);
        E = E - f / fp;
    }
    
    // Calculate true anomaly (nu) and distance (r)
    const cosNu = (Math.cos(E) - e) / (1 - e * Math.cos(E));
    const sinNu = (Math.sqrt(1 - e * e) * Math.sin(E)) / (1 - e * Math.cos(E));
    const nu = Math.atan2(sinNu, cosNu);
    
    const r = celestialBodies.earth.semiMajorAxis * (1 - e * Math.cos(E));
    
    // Calculate Earth's position in orbital plane
    celestialBodies.earth.position.x = r * Math.cos(nu);
    celestialBodies.earth.position.y = r * Math.sin(nu);
    celestialBodies.earth.position.z = 0; // Assuming orbit in XY plane
    
    // Calculate Earth's velocity for completeness (derivative of position)
    const nMean = 2 * Math.PI / EARTH_PERIOD; // Mean motion
    const h = Math.sqrt(G * celestialBodies.sun.mass * celestialBodies.earth.semiMajorAxis * (1 - e * e)); // Specific angular momentum
    
    celestialBodies.earth.velocity.x = -(h / r) * Math.sin(nu);
    celestialBodies.earth.velocity.y = (h / r) * (e + Math.cos(nu));
    celestialBodies.earth.velocity.z = 0;
}

// Update Moon physics (simplified - Earth gravity only)
function updateMoonPhysics(dt) {
    const moon = celestialBodies.moon;
    const earth = celestialBodies.earth;
    
    // Calculate distance from Moon to Earth (relative coordinates)
    const dx = moon.position.x;
    const dy = moon.position.y;
    const dz = moon.position.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    // Avoid division by zero
    if (distance < 1e-10) return;
    
    // Calculate gravitational acceleration from Earth only
    // a = GM/r² (towards Earth, so negative relative position components)
    const acceleration = G * earth.mass / (distance * distance);
    
    const ax = -acceleration * dx / distance;
    const ay = -acceleration * dy / distance;
    const az = -acceleration * dz / distance;
    
    // Update Moon's relative velocity
    moon.velocity.x += ax * dt;
    moon.velocity.y += ay * dt;
    moon.velocity.z += az * dt;
    
    // Update Moon's relative position
    moon.position.x += moon.velocity.x * dt;
    moon.position.y += moon.velocity.y * dt;
    moon.position.z += moon.velocity.z * dt;
}

// Setup UI controls
function setupControls() {
    const pauseBtn = document.getElementById('pauseBtn');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const trailsBtn = document.getElementById('trailsBtn');
    const labelsBtn = document.getElementById('labelsBtn');
    
    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
        pauseBtn.classList.toggle('active');
    });
    
    speedSlider.addEventListener('input', (e) => {
        speedMultiplier = parseFloat(e.target.value);
        speedValue.textContent = speedMultiplier.toFixed(1) + 'x';
    });
    
    trailsBtn.addEventListener('click', () => {
        showTrails = !showTrails;
        earthTrailLine.visible = showTrails;
        moonTrailLine.visible = showTrails;
        trailsBtn.classList.toggle('active');
        if (!showTrails) {
            earthTrail = [];
            moonTrail = [];
        }
    });
    
    labelsBtn.addEventListener('click', () => {
        showLabels = !showLabels;
        sunLabel.visible = showLabels;
        earthLabel.visible = showLabels;
        moonLabel.visible = showLabels;
        labelsBtn.classList.toggle('active');
    });
}

// Create text labels
function createLabels() {
    // Create canvas for labels
    function createLabelCanvas(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = 'Bold 24px Orbitron';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText(text, 128, 40);
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(10, 2.5, 1);
        return sprite;
    }
    
    sunLabel = createLabelCanvas('Sun');
    sunLabel.position.y = 12;
    sun.add(sunLabel);
    sunLabel.visible = false;
    
    earthLabel = createLabelCanvas('Earth');
    earthLabel.position.y = 4;
    earth.add(earthLabel);
    earthLabel.visible = false;
    
    moonLabel = createLabelCanvas('Moon');
    moonLabel.position.y = 2;
    moon.add(moonLabel);
    moonLabel.visible = false;
}

// Update labels to face camera
function updateLabels() {
    sunLabel.lookAt(camera.position);
    earthLabel.lookAt(camera.position);
    moonLabel.lookAt(camera.position);
}

// Update statistics display
function updateStats() {
    // Calculate Earth-Sun distance in real units
    const earthPos = celestialBodies.earth.position;
    const earthDistanceMeters = Math.sqrt(earthPos.x*earthPos.x + earthPos.y*earthPos.y + earthPos.z*earthPos.z);
    const earthDistanceKm = earthDistanceMeters / 1000;
    const earthDistanceMKm = earthDistanceKm / 1000000;
    document.getElementById('distance').textContent = earthDistanceMKm.toFixed(1) + 'M km';
    
    // Calculate Earth orbital speed in real units
    const earthVel = celestialBodies.earth.velocity;
    const earthSpeedMs = Math.sqrt(earthVel.x*earthVel.x + earthVel.y*earthVel.y + earthVel.z*earthVel.z);
    const earthSpeedKms = earthSpeedMs / 1000;
    document.getElementById('orbitalSpeed').textContent = earthSpeedKms.toFixed(2) + ' km/s';
    
    // Calculate day of year based on simulation time
    const dayOfYear = Math.floor((simulationTime / (24 * 3600)) % 365.25) + 1;
    document.getElementById('dayOfYear').textContent = dayOfYear;
    
    // Camera distance
    const cameraDist = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    document.getElementById('cameraDistance').textContent = cameraDist.toFixed(1);
}

// Handle mouse movement for tooltips
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([sun, earth, moon]);
    const tooltip = document.getElementById('tooltip');
    
    if (intersects.length > 0) {
        const object = intersects[0].object;
        let tooltipText = '';
        
        if (object === sun) {
            tooltipText = 'Sun<br>Mass: 1.989 × 10³⁰ kg<br>Radius: 696,340 km';
        } else if (object === earth) {
            tooltipText = 'Earth<br>Mass: 5.972 × 10²⁴ kg<br>Radius: 6,371 km';
        } else if (object === moon) {
            tooltipText = 'Moon<br>Mass: 7.342 × 10²² kg<br>Radius: 1,737 km';
        }
        
        tooltip.innerHTML = tooltipText;
        tooltip.style.left = event.clientX + 10 + 'px';
        tooltip.style.top = event.clientY - 30 + 'px';
        tooltip.style.opacity = '1';
    } else {
        tooltip.style.opacity = '0';
    }
}

// Initialize the scene
init();
