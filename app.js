var fs      = require('fs');
var app = require('express')()
  	,server = require('http').createServer(app)
  	,io = require('socket.io').listen(server)
  	,mongoose = require('mongoose').connect(process.env.MONGOLAB_URL))
  	,db = mongoose.connection
  	,currentSessions = [];

var RoomDB;
	
server.listen(8080);

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  	// Create your schemas and models here.
  	console.log('connected');

  	var roomSchema = new mongoose.Schema({
  		id: Number,
  		name: String,
  		lines: [{ username: String, line: String, dateTime: Date }]
  	});

  	/**
*******************************************************
*	Room, user en line objecten
*******************************************************
**/
	roomSchema.methods.addLine = function(params, callback){
		var socketId = params.socketId
			,line = params.line;

		if(this.getUser(socketId) !== null){
			this.lines.push(new Line(this.users[this.getUser(socketId)],line));
			this.notifyLines();
			return true;
		}
		return false;

		callback();
	}

	roomSchema.methods.getUser = function(socketId){
		for (var i = this.users.length - 1; i >= 0; i--) {
			if(this.users[i].socketId == socketId){
				return i;
			}
		};
		return null;
	}

	roomSchema.methods.addUser = function(user){
		this.users.push(user);
		this.notifyUsers();
		this.notifyLines();
		return true;
	}

	roomSchema.methods.removeUser = function(socket, callback){
		if(this.getUser(socket.id) !== null){
			this.users.splice(this.getUser(socket.id), 1);
			socket.leave(this.id);
			this.notifyUsers();
			return true;
		}
		
		callback();
	}

	roomSchema.methods.notifyUsers = function(){
		console.log('notifyUsers');
		io.to(this.id).emit('users', {users: this.users});  
	}

	roomSchema.methods.notifyLines = function(){
		console.log('notifylines');
		io.to(this.id).emit('lines', {lines: this.lines});
	}
/**
*******************************************************
*******************************************************
**/

  	Room = mongoose.model('Room', roomSchema);
});

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
app.get('/client.js', function (req, res) {
  res.sendfile(__dirname + '/client.js');
});

io.on('connection', function(socket){
	// Return all rooms for the new connection
	Room.find(function(err, rooms){
		socket.emit('rooms', { rooms: rooms });
	});
	
	socket.on('addRoom', function(param){
		console.log('addRoom');
		addRoom(param.name);
	});

	socket.on('enterRoom', function(param){
		console.log('enterRoom');
		enterRoom(socket, param.roomId, param.username);
	});

	socket.on('addLine', function(param){
		console.log('addLine');
		addLine(socket.id, param.roomId, param.line);
	});

	socket.on('disconnect', function(param){
		console.log('disconnect');
		disconnect(socket);
	});
});

/**
*******************************************************
*	Mogelijke acties
*******************************************************
**/
function addRoom(name) {
	var maxId = 0;
	Room.find().sort({ id: -1 }).limit(1).exec(function(err, room){ maxId = room.id; });
	
	var newRoom = new Room({ id: ++maxId, name: name });
	newRoom.save(function(err){	
		Room.find(function(err, rooms){
			io.emit('rooms', { rooms: rooms });
		});
	});
}

function enterRoom(socket, roomId, username) {
	// User uit alle rooms halen zodat hij hier geen updates meer van krijgt
	disconnect(socket);

	var foundRoom = findRoom(roomId);
	if(foundRoom !== undefined) {
		var existingUser = foundRoom.getUser(socket.id);
		if(existingUser === null) {
			socket.join(foundRoom.id);
			foundRoom.addUser(new User(username, socket.id))
		}
	}
}

function addLine(socketId, roomId, line) {
	var foundRoom = findRoom(roomId);
	if(foundRoom !== undefined) {
		foundRoom.addLine(socketId, line);
	}
}
/**
*******************************************************
*******************************************************
**/

/**
*******************************************************
*	Helper methods
*******************************************************
**/
function findRoom(id){
	Room.find({ id: id }).exec(function(err, room){
		return room;
	});
}

function disconnect(socket){
	Room.find().exec(function(err, room){
		room.removeUser(socket);		
	});
}
/**
*******************************************************
*******************************************************
**/

/**
*******************************************************
*	Functies om index.html en client.js terug te geven.
*******************************************************
**/
function indexHTML(req, res, next) {
    returnFile(req, res, next, 'index.html', 'text/html');
}

function clientJS(req, res, next) {
    returnFile(req, res, next, 'client.js', 'text/javascript');
}

function returnFile(req, res, next, filename, contenttype) {
    fs.readFile(__dirname + '/' + filename, function (err, data) {
        if (err) {
            next(err);
            return;
        }

    	res.setHeader('Content-Type', contenttype);
        res.writeHead(200);
        res.end(data);
        next();
	});
}
/**
*******************************************************
*******************************************************
**/