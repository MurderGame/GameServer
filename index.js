const path = require('path')
const net = require('net')

const args = require('gar')(process.argv.slice(2))

const canvax = require('canvaxjs')
const eucli = require('eucli')

const commonAbstractorFactory = require(path.join(__dirname, 'commonAbstractorFactory.js'))

const debugMode = args.debug ? true : false

if (debugMode) {
	console.log('> Heads up: Debug mode enabled!')
}

let clients = []

const gameState = {
	'enemies': [],
	'powerups': [],
	'width': 1280,
	'height': 720,
	'backgroundColor': '#F7F7F7',
	'backgroundColors': ['#515261', '#B1C4D2', '#E5E5E5', '#3D3D3D', '#F2F2F0'],
	'currentBackgroundColorIndex': 0
}

const addEnemy = () => {
	const direction = Math.floor(Math.random() * 2)
	
	const x = Math.floor(Math.random() * gameState.width)
	const y = Math.floor(Math.random() * gameState.height)
	
	gameState.enemies.push({
		'direction': direction,
		'xspeed': direction === 0 ? 2 : 0,
		'yspeed': direction === 1 ? 2 : 0,
		'entity': new canvax.Circle({
			'x': x,
			'y': y,
			'radius': 30,
			'backgroundColor': '#DF5A49',
			'borderColor': null
		})
	})
}

for (let i = 0; i < 5; i++) {
	addEnemy()
}

const findSafeLocation = () => {
	let safe = false
	let loc = []
	
	const entities = gameState.enemies.concat(gameState.powerups).concat(clients.filter((client) => typeof client.data === 'object').map((client) => client.data))
	
	while (safe === false) {
		loc = [Math.floor(Math.random() * (gameState.width - 100)) + 50, Math.floor(Math.random() * (gameState.height - 160)) + 80]
		
		safe = true
		
		for (let i = 0; i < entities.length; i++) {
			if (eucli(loc, [entities[i].entity.x, entities[i].entity.y]) < 300) {
				safe = false
			}
		}
	}
	
	return loc
}

const nextBackgroundColor = () => {
	gameState.backgroundColor = gameState.backgroundColors[gameState.currentBackgroundColorIndex]

	gameState.currentBackgroundColorIndex++

	if (gameState.currentBackgroundColorIndex > gameState.backgroundColors.length - 1) {
		gameState.currentBackgroundColorIndex = 0
	}
}

const powerupTypes = ['slow', 'destroy']

const addPowerUp = () => {
	const pos = findSafeLocation()
	
	gameState.powerups.push({
		'type': powerupTypes[Math.floor(Math.random() * powerupTypes.length)],
		'xspeed': 0,
		'yspeed': 0,
		'entity': new canvax.Circle({
			'x': pos[0],
			'y': pos[1],
			'radius': 15,
			'backgroundColor': '#2ED069'
		})
	})
}

const playerColors = ['#4EBA6F', '#2D95BF', '#955BA5', '#334D5C', '#45B29D']

const randomColor = () => playerColors[Math.floor(Math.random() * playerColors.length)]

const getConnectedClients = () => clients.filter((client) => typeof client.abstractor === 'object' && typeof client.data === 'object')

const chatAll = (message) => {
	getConnectedClients().forEach((client) => {
		client.abstractor.send('chat', {
			'message': message
		})
	})
}

const sendAll = (event, data) => {
	getConnectedClients().forEach((client) => {
		client.abstractor.send(event, data)
	})
}

const server = net.createServer((client) => {
	console.log('A client connected.')
	
	const abstractor = commonAbstractorFactory()
	
	client.abstractor = abstractor
	
	const spawnSafeLoc = findSafeLocation()
	
	const playerColor = randomColor()
	
	client.data = {
		'originalColor': playerColor,
		'keys': [],
		'powerup': null,
		'score': 0,
		'vel': {
			'x': 0,
			'y': 0
		},
		'dead': false,
		'entity': new canvax.Rectangle({
			'x': spawnSafeLoc[0],
			'y': spawnSafeLoc[1],
			'width': 30,
			'height': 30,
			'backgroundColor': playerColor
		})
	}
	
	client.pipe(client.abstractor)
	abstractor.pipe(client)
	
	clients.push(client)
	
	client.on('close', () => {
		console.log('A client disconnected.')
		
		clients.splice(clients.indexOf(client), 1)
	})
	
	client.on('error', (err) => {
		console.log('A client errored. ' + err)
	})
	
	abstractor.on('profile', (data) => {
		client.data.name = data.name
	})

	abstractor.on('chat', (data) => {
		if (data.message.length > 201) {
			client.end()
			return
		}
		
		console.log(client.data.name + ': ' + data.message)
		
		chatAll(client.data.name + ': ' + data.message)
	})
	
	abstractor.on('keydown', (data) => {
		data.key = data.key.toLowerCase()
		
		if (!client.data.keys.includes(data.key)) client.data.keys.push(data.key)
	})

	abstractor.on('keyup', (data) => {
		data.key = data.key.toLowerCase()
		
		if (client.data.keys.includes(data.key)) client.data.keys.splice(client.data.keys.indexOf(data.key), 1)
	})

	abstractor.on('respawn', () => {
		if (client.data.dead === false) return
		
		console.log('Client respawns')

		client.data.powerup = null
		
		client.data.score = 0
		
		const safeLoc = findSafeLocation()
				
		client.data.entity.x = safeLoc[0]
		client.data.entity.y = safeLoc[1]
		
		client.data.vel.x = 0
		client.data.vel.y = 0
		
		client.data.dead = false
	})
})

server.listen(5135, () => {
	console.log('Listening.')
})

addPowerUp()

const waitAddPowerup = () => {
	setTimeout(() => {
		const eligibleClients = clients.filter((client) => typeof client.data === 'object' && client.data.dead === false)
		
		if (eligibleClients.length > debugMode ? 0 : 1) {
			addPowerUp()
		}
		else waitAddPowerup()
	}, 1000 + Math.floor(Math.random() * 400))
}

const setActivePowerup = (type, mode, target) => {
	clients.filter((client) => typeof client.data === 'object').forEach((client) => {
		client.data.powerup = null
		
		if (mode === 'others') {
			if (client !== target) client.data.powerup = type
		}
		else if (client === target) {
			client.data.powerup = type
		}
	})
}

setInterval(() => {
	// Update enemy data

	for (let i = 0; i < gameState.enemies.length; i++) {
		const enemy = gameState.enemies[i]
		
		enemy.entity.x += enemy.xspeed
		enemy.entity.y += enemy.yspeed
		
		if (enemy.entity.y + enemy.entity.radius > gameState.height || enemy.entity.y - enemy.entity.radius < 0) enemy.yspeed *= -1
		
		if (enemy.entity.x + enemy.entity.radius > gameState.width || enemy.entity.x - enemy.entity.radius < 0) enemy.xspeed *= -1
	}
	
	// Update client data (movement)
	
	for (let i = 0; i < clients.length; i++) {
		const client = clients[i]
		
		if (typeof client.data !== 'object') continue
		
		if (client.data.dead === true) continue
		
		if (client.data.keys.includes('arrowup')) {
			client.data.vel.y += -0.4
		}
		
		if (client.data.keys.includes('arrowdown')) {
			client.data.vel.y += 0.4
		}
		
		if (client.data.keys.includes('arrowright')) {
			client.data.vel.x += 0.4
		}
		
		if (client.data.keys.includes('arrowleft')) {
			client.data.vel.x += -0.4
		}
		
		if (client.data.entity.x < 0 && client.data.vel.x < 0) client.data.vel.x = 0
		if (client.data.entity.x + client.data.entity.width > gameState.width && client.data.vel.x > 0) client.data.vel.x = 0
		
		if (client.data.entity.y < 0 && client.data.vel.y < 0) client.data.vel.y = 0
		if (client.data.entity.y + client.data.entity.height > gameState.height && client.data.vel.y > 0) client.data.vel.y = 0
		
		client.data.vel.y *= 0.91
		client.data.vel.x *= 0.91
		
		if (client.data.powerup === 'slow') {
			client.data.vel.y *= 0.85
			client.data.vel.x *= 0.85
		}
		
		if (client.data.powerup === 'destroy') {
			client.data.entity.backgroundColor = '#B50000'
		}
		else {
			client.data.entity.backgroundColor = client.data.originalColor
		}
		
		client.data.entity.x += client.data.vel.x
		client.data.entity.y += client.data.vel.y
	}
	
	// Detect collisions
	
	for (let i = 0; i < clients.length; i++) {
		const client = clients[i]
		
		if (typeof client.data !== 'object') continue
		
		if (client.data.dead === true) continue
		
		// Player collisions
		
		for (let i = 0; i < clients.length; i++) {
			const client2 = clients[i]
			
			if (client2 === client) continue
			
			if (client2.data.entity.touches(client.data.entity)) {
				if (client2.data.powerup === 'destroy') {
					chatAll('> ' + client2.data.name + ' killed ' + client.data.name)
					
					client.data.dead = true

					client2.data.score += 1
					
					setTimeout(() => {
						client.abstractor.send('dead', {})
					}, 1000)
				}
			}
		}
		
		// Enemy collisions
		
		for (let i = 0; i < gameState.enemies.length; i++) {
			const enemy = gameState.enemies[i]
			
			if (enemy.entity.touches(client.data.entity)) {
				client.data.dead = true
				
				setTimeout(() => {
					client.abstractor.send('dead', {})
				}, 1000)
			}
		}
		
		// Powerup collisions
		
		for (let i = 0; i < gameState.powerups.length; i++) {
			const powerup = gameState.powerups[i]
			
			if (powerup.entity.touches(client.data.entity)) {
				sendAll('blur', {})

				sendAll('particle', {
					'type': 0,
					'x': client.data.entity.x,
					'y': client.data.entity.y,
					'color': '#1AAF5D'
				})

				client.data.score += 1

				nextBackgroundColor()
				
				//addEnemy()
				
				gameState.powerups.splice(i, 1)
				
				console.log(powerup.type + ' powerup collected by ' + client.data.name)
				
				if (powerup.type === 'slow') {
					setActivePowerup('slow', 'others', client)
				}
				else if (powerup.type === 'destroy') {
					setActivePowerup('destroy', 'same', client)
				}
				
				waitAddPowerup()
			}
		}
	}
}, 5)

setInterval(() => {
	const renderData = {
		'entities': []
	}
	
	// Render players
	
	for (let i = 0; i < clients.length; i++) {
		const client = clients[i]
		
		if (typeof client.data !== 'object') continue
		
		if (client.data.dead === true) continue
		
		renderData.entities.push({
			'type': 0,
			'color': client.data.entity.backgroundColor,
			'x': client.data.entity.x,
			'y': client.data.entity.y,
			'width': client.data.entity.width,
			'height': client.data.entity.height,
			'xvel': client.data.vel.x,
			'yvel': client.data.vel.y,
			'name': (typeof client.data.name === 'string' ? client.data.name : '') + ' (' + client.data.score + ')',
			'client': client
		})
	}
	
	// Render enemies
	
	for (let i = 0; i < gameState.enemies.length; i++) {
		const enemy = gameState.enemies[i]
		
		renderData.entities.push({
			'type': 1,
			'color': enemy.entity.backgroundColor,
			'x': enemy.entity.x,
			'y': enemy.entity.y,
			'width': enemy.entity.radius,
			'height': enemy.entity.radius,
			'xvel': enemy.xspeed,
			'yvel': enemy.yspeed,
			'name': '',
			'isClient': false
		})
	}
	
	// Render powerups
	
	for (let i = 0; i < gameState.powerups.length; i++) {
		const powerup = gameState.powerups[i]
		
		renderData.entities.push({
			'type': 1,
			'color': powerup.entity.backgroundColor,
			'x': powerup.entity.x,
			'y': powerup.entity.y,
			'width': powerup.entity.radius,
			'height': powerup.entity.radius,
			'xvel': powerup.xspeed,
			'yvel': powerup.yspeed,
			'name': powerup.type.toUpperCase(),
			'isClient': false
		})
	}

	// Set backgroundColor

	renderData.backgroundColor = gameState.backgroundColor
	
	// Send out renderData
	
	for (let i = 0; i < clients.length; i++) {
		renderData.entities.forEach((entity) => {
			entity.isClient = entity.client === clients[i]
		})

		clients[i].abstractor.send('render', renderData)
	}
}, 1)