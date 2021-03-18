/* global THREE, fetch */
const { WorldView, Viewer, MapControls } = require('prismarine-viewer/viewer')
const { Vec3 } = require('vec3')
global.THREE = require('three')

async function main () {
  const version = '1.16.4'
  
  const viewDistance = 10
  const center = new Vec3(0, 90, 0)

  const World = require('prismarine-world')(version)
  const Chunk = require('prismarine-chunk')(version)
  const mcData = require('minecraft-data')(version)

  const world = new World((x, z) => {
    const chunk = new Chunk()
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        for (let y = 0; y < 4; y++) {
          if (y === 0) {
            chunk.setBlockType(new Vec3(x, y, z), mcData.blocksByName.bedrock.id)
          } else if (y < 3) {
            chunk.setBlockType(new Vec3(x, y, z), mcData.blocksByName.dirt.id)
          } else {
            chunk.setBlockType(new Vec3(x, y, z), mcData.blocksByName.grass_block.id)
            chunk.setBlockData(new Vec3(x, y, z), 1)
          }
        }
      }
    }
    return chunk
  })

  const worldView = new WorldView(world, viewDistance, center)

  // Create three.js context, add to page
  const renderer = new THREE.WebGLRenderer()
  renderer.setPixelRatio(window.devicePixelRatio || 1)
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  // Create viewer
  const viewer = new Viewer(renderer)
  viewer.setVersion(version)
  // Attach controls to viewer
  const controls = new MapControls(viewer.camera, renderer.domElement)

  // Link WorldView and Viewer
  viewer.listen(worldView)
  // Initialize viewer, load chunks
  worldView.init(center)

  viewer.camera.position.set(center.x, center.y, center.z)
  controls.update()

  let id = 0
  for (const e of mcData.entitiesArray) {
    console.log(e.name)
    let i = Math.floor(id / 10)
    let j = id % 10
    viewer.updateEntity({ id: id++, name: e.name, pos: new Vec3(i * 5, 5, j*5), width: e.width, height: e.height, username: e.name })
  }

  // Browser animation loop
  const animate = () => {
    window.requestAnimationFrame(animate)
    if (controls) controls.update()
    worldView.updatePosition(controls.target)
    viewer.update()
    renderer.render(viewer.scene, viewer.camera)
  }
  animate()
}
main()
