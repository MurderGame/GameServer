const {Schema, StreamingAbstractor, types} = require('protocore')

module.exports = () => {
	const build = new StreamingAbstractor()
	
	build.register('render', new Schema([
		{
			'name': 'backgroundColor',
			'type': types.string
		},
		{
			'name': 'entities',
			'type': types.list,
			'of': new Schema([
				{
					'name': 'type',
					'type': types.uint,
					'size': 8
				},
				{
					'name': 'color',
					'type': types.string
				},
				{
					'name': 'x',
					'type': types.int,
					'size': 32
				},
				{
					'name': 'y',
					'type': types.int,
					'size': 32
				},
				{
					'name': 'width',
					'type': types.int,
					'size': 32
				},
				{
					'name': 'height',
					'type': types.int,
					'size': 32
				},
				{
					'name': 'xvel',
					'type': types.int,
					'size': 16
				},
				{
					'name': 'yvel',
					'type': types.int,
					'size': 16
				},
				{
					'name': 'name',
					'type': types.string
				},
				{
					'name': 'isClient',
					'type': types.boolean
				}
			])
		}
	]))
	
	build.register('profile', new Schema([
		{
			'name': 'name',
			'type': types.string
		}
	]))

	build.register('scoreboard', new Schema([
		{
			'name': 'scores',
			'type': types.list,
			'of': new Schema([
				{
					'name': 'name',
					'type': types.string
				},
				{
					'name': 'score',
					'type': types.uint,
					'size': 16
				}
			])
		}
	]))

	build.register('chat', new Schema([
		{
			'name': 'message',
			'type': types.string
		}
	]))
	
	build.register('keyup', new Schema([
		{
			'name': 'key',
			'type': types.string
		}
	]))
	
	build.register('keydown', new Schema([
		{
			'name': 'key',
			'type': types.string
		}
	]))

	build.register('particle', new Schema([
		{
			'name': 'type',
			'type': types.uint,
			'size': 8
		},
		{
			'name': 'x',
			'type': types.int,
			'size': 32
		},
		{
			'name': 'y',
			'type': types.int,
			'size': 32
		},
		{
			'name': 'color',
			'type': types.string
		}
	]))

	build.register('blur', new Schema([]))
	
	build.register('dead', new Schema([]))
	
	build.register('respawn', new Schema([]))

	return build
}