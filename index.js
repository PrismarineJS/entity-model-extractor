const fs = require('fs')
const mcData = require('minecraft-data')('1.16.4')
const stripJsonComments = require('strip-json-comments')
const stringify = require('json-stringify-pretty-compact')
// const { promisify } = require('util')
// const sizeOf = promisify(require('image-size'))

async function main () {
  const paths = {
    entity: './MCBVanillaResourcePack/entity/',
    models: './MCBVanillaResourcePack/models/',
    anims: './MCBVanillaResourcePack/animations/',
    animControllers: './MCBVanillaResourcePack/animation_controllers/',
    renderControllers: './MCBVanillaResourcePack/render_controllers/'
  }

  // Process geometry

  const geoVersions = []
  const geometry = require(paths.models + 'mobs.json')
  geoVersions.push(geometry.format_version)

  Object.assign(geometry, require('./data/boat.geom.json'))

  function loadGeometry (file) {
    const geo = JSON.parse(stripJsonComments(fs.readFileSync(paths.models + 'entity/' + file, 'utf-8')))
    if (geoVersions.indexOf(geo.format_version) < 0) {
      console.log(geo.format_version, file)
      geoVersions.push(geo.format_version)
    }
    if (geo['minecraft:geometry']) {
      for (const g of geo['minecraft:geometry']) {
        const id = g.description.identifier
        g.visible_bounds_width = g.description.visible_bounds_width
        g.visible_bounds_height = g.description.visible_bounds_height
        g.visible_bounds_offset = g.description.visible_bounds_offset
        g.texturewidth = g.description.texture_width
        g.textureheight = g.description.texture_height
        delete g.description
        geometry[id] = g
      }
    } else {
      Object.assign(geometry, geo)
    }
  }

  for (const file of fs.readdirSync(paths.models + 'entity/')) {
    loadGeometry(file)
  }

  // fs.writeFileSync('out/geometry.json', stringify(geometry))
  // console.log(geoVersions)
  // process.exit(0)

  // Process animations
  const animations = {}
  const animVersions = []

  for (const file of fs.readdirSync(paths.anims)) {
    const anim = JSON.parse(stripJsonComments(fs.readFileSync(paths.anims + file, 'utf-8')))
    if (animVersions.indexOf(anim.format_version) < 0) {
      console.log(anim.format_version, file)
      animVersions.push(anim.format_version)
    }
    Object.assign(animations, anim.animations)
  }

  // fs.writeFileSync('out/anims.json', stringify(animations))
  // console.log(animVersions)
  // process.exit(0)

  // Process animation controllers

  const animControllers = {}
  for (const file of fs.readdirSync(paths.animControllers)) {
    const anim = JSON.parse(stripJsonComments(fs.readFileSync(paths.animControllers + file, 'utf-8')))
    Object.assign(animControllers, anim.animation_controllers)
  }
  // fs.writeFileSync('out/animControllers.json', stringify(animControllers))

  // Process render controllers

  const renderControllers = {}
  for (const file of fs.readdirSync(paths.renderControllers)) {
    const render = JSON.parse(stripJsonComments(fs.readFileSync(paths.renderControllers + file, 'utf-8')))
    Object.assign(renderControllers, render.renderControllers)
  }
  // fs.writeFileSync('out/renderControllers.json', stringify(renderControllers))

  // Process entities

  const entityMapping = {
    agent: null,
    bed: null,
    ender_eye: 'eye_of_ender',
    evocation_fang: 'evoker_fangs',
    evocation_illager: 'evoker',
    fireworks_rocket: 'firework_rocket',
    fishing_hook: 'fishing_bobber',
    lingering_potion: null,
    npc: null,
    shield: null,
    skull: null,
    splash_potion: 'potion',
    thrown_trident: 'trident',
    tripod_camera: null,
    tropicalfish: 'tropical_fish',
    wither_skull_dangerous: null,
    zombie_pigman: 'zombified_piglin'
  }

  const geoPatch = {
    'geometry.humanoid.custom': 'geometry.humanoid.custom:geometry.humanoid',
    'geometry.sheep.v1.8': 'geometry.sheep.v1.8:geometry.sheep.sheared.v1.8',
    'geometry.villager.witch.v1.8': 'geometry.villager.witch.v1.8:geometry.villager.v1.8'
  }

  // Additional files to add
  const patchs = fs.readdirSync('./data/').map(x => './data/' + x)

  const entities = {}
  let entityPaths = fs.readdirSync(paths.entity).map(x => paths.entity + x)
  entityPaths = entityPaths.concat(patchs.filter(x => x.includes('.entity.json')))
  for (const file of entityPaths) {
    if (file.includes('v1.0') || file.includes('v2')) continue
    let name = file.split('/')[file.split('/').length - 1].replace('.entity.json', '')

    if (entityMapping[name] === null) continue
    else if (entityMapping[name] !== undefined) name = entityMapping[name]

    if (!mcData.entitiesByName[name]) console.log('unknown entity', `'${name}': '',`)

    const entity = JSON.parse(stripJsonComments(fs.readFileSync(file, 'utf-8')))['minecraft:client_entity'].description

    // Inline geometry
    for (const key in entity.geometry) {
      let id = entity.geometry[key]
      if (geoPatch[id] !== undefined) id = geoPatch[id]
      const geo = geometry[id]
      if (!geo) {
        console.log('unknown geo ', entity.geometry[key], 'for', name)
      }
      entity.geometry[key] = geo
    }

    // Inline animations
    for (const key in entity.animations) {
      const id = entity.animations[key]
      const anim = animations[id]
      if (id.startsWith('controller')) {
        if (!entity.animation_controllers) entity.animation_controllers = {}
        entity.animation_controllers[key] = id
        delete entity.animations[key]
      } else if (!anim) {
        console.log('unknown anim ', entity.animations[key], 'for', name)
      } else {
        entity.animations[key] = anim
      }
    }

    // Inline animation controllers
    if (entity.animation_controllers instanceof Array) {
      const controllers = {}
      for (const controller of entity.animation_controllers) {
        Object.assign(controllers, controller)
      }
      entity.animation_controllers = controllers
    }
    for (const key in entity.animation_controllers) {
      const id = entity.animation_controllers[key]
      const controller = animControllers[id]
      if (!controller) {
        console.log('unknown controller ', entity.animation_controllers[key], 'for', name)
      } else {
        entity.animation_controllers[key] = controller
      }
    }

    // Inline render controllers

    entities[name] = entity
  }

  for (const e of mcData.entitiesArray) {
    if (!entities[e.name]) console.log('missing entity', e.name)
  }

  const textureFolder = '../minecraft-assets/data/1.16.4/'
  // Patch texture paths
  const texturePathMapping = require('./texturemap.json')
  for (const e of Object.values(entities)) {
    for (const name of Object.keys(e.textures)) {
      let texture = e.textures[name]
      if (texturePathMapping[texture]) {
        texture = texturePathMapping[texture]
        e.textures[name] = texture
      }
      if (!fs.existsSync(texture.replace('textures/', textureFolder) + '.png')) {
        console.log('missing texture at', texture)
      }
    }
  }

  // Fill missing texture sizes
  /* for (const e of Object.values(entities)) {
    for (const [gname, g] of Object.entries(e.geometry)) {
      if (!g.texturewidth || g.textureheight) {
        console.log('missing texture size for', e.identifier, gname)
        let tex = e.textures[gname]
        if (!tex) tex = Object.values(e.textures)[0]
        tex = tex.replace('textures/', textureFolder) + '.png'
        let size
        try {
          size = await sizeOf(tex)
        } catch {}
        console.log(tex, size)
        if (size) {
          g.texturewidth = size.width
          g.textureheight = size.height
        }
      }
    }
  } */

  fs.writeFileSync('out/entities.json', stringify(entities))
}
main()
