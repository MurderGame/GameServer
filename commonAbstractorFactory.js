const {Schema, StreamingAbstractor, types} = require('protocore')

module.exports = () => {
	const build = new StreamingAbstractor()
	
	build.register('render', new Schema([
		{
			"name": 'entities',
			"type": types.list,
			"of": new Schema([
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
	
	build.register('dead', new Schema([]))
	
	build.register('respawn', new Schema([]))

	return build
}