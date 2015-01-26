/**
*******************************************************
* Initializing
*******************************************************
**/
var url = "http://127.0.0.1:8080",
    currentRoomId,
    currentUsername,
    socket;

$(document).ready(function() {
  $("#btnAddRoom").click(addRoom);
  $(".btnPostNewLine").click(postNewLine);

  connectToServer();
});

function connectToServer(){
  // create the socket.io connection
  socket = io.connect(url);
  // message handler for newcount message
  socket.on('rooms', roomsUpdated);
  socket.on('users', usersUpdated);
  socket.on('lines', linesUpdated);
}
/**
*******************************************************
*******************************************************
**/

/**
*******************************************************
* Server initiated
*******************************************************
**/
function roomsUpdated(data){
  var html = "";
  for (var i = data.rooms.length - 1; i >= 0; i--) {
    html += "<a href='#' data-room-id='" + data.rooms[i].id + "' class='btnEnterRoom'>" + data.rooms[i].name + "</a><br />"; 
  };

  $('#roomlist').html(html);
  $('#roomlist .btnEnterRoom').click(enterRoom);
}

function usersUpdated(data){
  var html = '';
  for (var i = data.users.length - 1; i >= 0; i--) {
    html += "<li>" + data.users[i].name + "</li>"; 
  };

  $('#currentRoom .users').html(html);
}

function linesUpdated(data){
  var html = '';
  for (var i = data.lines.length - 1; i >= 0; i--) {
    html += "<li><b>" + data.lines[i].user.name + "</b><i>" + formatDate(new Date(data.lines[i].dateTime)) + "</i>:" + data.lines[i].line + "</li>"; 
  };

  $('#currentRoom .lines').html(html);
}
/**
*******************************************************
*******************************************************
**/

/**
*******************************************************
* Client initiated
*******************************************************
**/
function addRoom() {
  var roomname = $("#txtRoomname").val();
  socket.emit('addRoom', { name: roomname });
}

function enterRoom(e){
  e.preventDefault();

  currentUsername = $("#txtUsername").val();
  if(currentUsername.length === 0){
    alert('Voer eerst een gebruikersnaam in');
  } else {
    $("#txtUsername").text("");
    currentRoomId = $(this).attr("data-room-id");
    var currentRoomName = $(this).text();
    $('#currentRoom .roomName').text(currentRoomName);
    socket.emit('enterRoom', { roomId: currentRoomId, username: currentUsername });
  }
}

function postNewLine(e){
  e.preventDefault();
  var newLine = $("#currentRoom .txtNewLine").val();
  if(currentRoomId > 0 && newLine.length){
    socket.emit('addLine', { roomId: currentRoomId, line: newLine });
  }
}
/**
*******************************************************
*******************************************************
**/

/**
*******************************************************
* Helper functions
*******************************************************
**/
function formatDate(theDate){
  if(theDate){
    return theDate.getDate() + '-' + (parseInt(theDate.getMonth()) + 1) + '-' + theDate.getFullYear() + ' ' + theDate.getHours() + ':' + theDate.getMinutes();
  }
}
/**
*******************************************************
*******************************************************
**/