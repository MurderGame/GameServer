const path = require('path')
const net = require('net')

const args = require('gar')(process.argv.slice(2))

const canvax = require('canvaxjs')
const eucli = require('eucli')

const commonAbstractorFactory = require(path.join(__dirname, 'commonAbstractorFactory.js'))

let clients = []

const gameState = {
	'enemies': [],
	'powerups': [],
	'width': 1280,
	'height': 720
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
		loc = [Math.floor(Math.random() * (gameState.width - 50)), Math.floor(Math.random() * (gameState.height - 80))]
		
		safe = true
		
		for (let i = 0; i < entities.length; i++) {
			if (eucli(loc, [entities[i].entity.x, entities[i].entity.y]) < 300) {
				safe = false
			}
		}
	}
	
	return loc
}

const addPowerUp = () => {
	const pos = findSafeLocation()
	
	gameState.powerups.push({
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

const server = net.createServer((client) => {
	console.log('A client connected.')
	
	const abstractor = commonAbstractorFactory()
	
	client.abstractor = abstractor
	
	const spawnSafeLoc = findSafeLocation()
	
	client.data = {
		'keys': [],
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
			'backgroundColor': randomColor()
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
		
		for (let i = 0; i < clients.length; i++) {
			if (clients[i].abstractor) {
				clients[i].abstractor.send('chat', {
					'message': data.message,
					'from': client.data.name
				})
			}
		}
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

setInterval(() => {
	// Update enemy data

	for (let i = 0; i < gameState.enemies.length; i++) {
		const enemy = gameState.enemies[i]
		
		enemy.entity.x += enemy.xspeed
		enemy.entity.y += enemy.yspeed
		
		if (enemy.entity.y > gameState.height || enemy.entity.y < 0) enemy.yspeed *= -1
		
		if (enemy.entity.x > gameState.width || enemy.entity.x < 0) enemy.xspeed *= -1
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
		if (client.data.entity.x > gameState.width - 30 && client.data.vel.x > 0) client.data.vel.x = 0
			
		if (client.data.entity.y < 0 && client.data.vel.y < 0) client.data.vel.y = 0
		if (client.data.entity.y > gameState.height - 65 && client.data.vel.y > 0) client.data.vel.y = 0
		
		client.data.vel.y *= 0.91
		client.data.vel.x *= 0.91
		
		client.data.entity.x += client.data.vel.x
		client.data.entity.y += client.data.vel.y
	}
	
	// Detect collisions
	
	for (let i = 0; i < clients.length; i++) {
		const client = clients[i]
		
		if (typeof client.data !== 'object') continue
		
		if (client.data.dead === true) continue
		
		// Enemy collisions
		
		for (let i = 0; i < gameState.enemies.length; i++) {
			const enemy = gameState.enemies[i]
			
			if (enemy.entity.touches(client.data.entity)) {
				client.data.dead = true
				
				setTimeout(() => {
					client.abstractor.send('dead', {})
				}, 1500)
			}
		}
		
		// Powerup collisions
		
		for (let i = 0; i < gameState.powerups.length; i++) {
			const powerup = gameState.powerups[i]
			
			if (powerup.entity.touches(client.data.entity)) {
				client.data.score += 1
				
				//addEnemy()
				
				gameState.powerups.splice(i, 1)
				
				addPowerUp()
				
				console.log('Powerup collected by ' + client.data.name)
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
			'name': (typeof client.data.name === 'string' ? client.data.name : '') + ' (' + client.data.score + ')'
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
			'name': ''
		})
	}
	
	// Render powerups
	
	for (let i = 0; i < gameState.powerups.length; i++) {
		const enemy = gameState.powerups[i]
		
		renderData.entities.push({
			'type': 1,
			'color': enemy.entity.backgroundColor,
			'x': enemy.entity.x,
			'y': enemy.entity.y,
			'width': enemy.entity.radius,
			'height': enemy.entity.radius,
			'xvel': enemy.xspeed,
			'yvel': enemy.yspeed,
			'name': ''
		})
	}
	
	// Send out renderData
	
	for (let i = 0; i < clients.length; i++) {
		clients[i].abstractor.send('render', renderData)
	}
}, 1)