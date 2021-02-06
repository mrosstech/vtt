
// grab the webpage elements
var divSelectCampaign = document.getElementById("campaign_id_div");
var divPlayersVideo = document.getElementById("players_video");
var inputCampaignID = document.getElementById("campaign_id_input");
var btnEnterCampaign = document.getElementById("btnCampaignId");
var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVideo");

// Global Variables
var campaignID;
var localStream;
var remoteStream;
var rtcPeerConnection;

// STUN Servers
var iceServers = {
    'iceServers':[
        {'url':'stun:stun.services.mozilla.com'},
        {'url':'stun:stun.l.google.com:19302'}
    ]
}

var streamConstraints = {audio: true, video: true};
var isCaller;

//Connect to the socket.io server
var socket = io();

// Add click event to the button
btnEnterCampaign.onclick = function() {
    if (inputCampaignID.value === '') {
        alert("Please type a campaign ID!");
    } else {
        
        campaignID = inputCampaignID.value;
        console.log('Setting campaignID to: ' + campaignID)
        socket.emit('create or join', campaignID);
        divSelectCampaign.style = "display: none;";
        divPlayersVideo.style = "display: block;";
    }
}

// Event handlers below!

// Whenn server emits created
socket.on('created', function (room) {
    // Caller gets user media devices with defined constraints
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream;  // sets local stream to variable
        // localVideo.src = URL.createObjectURL(stream); //shows stream to user
        localVideo.srcObject = stream;
        isCaller = true; //sets current user as caller
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices' + err);
    });
});

// when server emits joined
socket.on('joined', function (room) {
    // callee gets user media devices
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream; // sets local stream to variable
        // localVideo.src = URL.createObjectURL(stream); // shows stream to user
        localVideo.srcObject = stream;
        socket.emit('ready', campaignID)
    })
})

// when server emits ready
socket.on('ready', function () {
    if (isCaller) {  // Is this the originator of the room?
        // Creates an RTCPeerConnection object
        rtcPeerConnection = new RTCPeerConnection(iceServers);

        // adds event listeners to the newly created object
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.onaddstream = onAddStream;

        // adds the current local stream  to the object
        rtcPeerConnection.addStream(localStream);

        // prepares an offer
        rtcPeerConnection.createOffer(setLocalAndOffer, function(e){console.log(e)});
    }
});

// when server emits offer
socket.on('offer', function (event) {
    if (!isCaller) {
        // creates an RTCPeerConnection object
        rtcPeerConnection = new RTCPeerConnection(iceServers);

        // adds event listeners to the newly created object
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.onaddstream = onAddStream;
        
        // adds the current local stream to the object
        rtcPeerConnection.addStream(localStream);

        // stores the offer as a remote description
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));

        // Prepares an answer
        rtcPeerConnection.createAnswer(setLocalAndAnswer, function(e){console.log(e)});
    }
});

// when server emits an answer
socket.on('answer', function (event) {
    // stores the answer as a remote description
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));

});

// when server emits a candidate
socket.on('candidate', function(event) {
    // creates a candidate object
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    // store candidate
    rtcPeerConnection.addIceCandidate(candidate);
});



// These are the functions referenced before as listeners to the peer connection

// when a user receives the other users video and audio stream
function onAddStream(event) {
    // remoteVideo.src = URL.createObjectURL(eventStream);
    remoteVideo.srcObject = event.stream;
    remoteStream = event.stream;
}

// sends a candidate message to the server
function onIceCandidate(event) {
    if (event.candidate) {
        console.log('sending ice candidate');
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: campaignID
        })
    }
}

//stores offer and sends message to server
function setLocalAndOffer(sessionDescription) {
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('offer', {
        type: 'offer',
        sdp: sessionDescription,
        room: campaignID
    });
}

// stores answer and sends a message to the server
function setLocalAndAnswer(sessionDescription) {
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('answer', {
        type: 'answer',
        sdp: sessionDescription,
        room: campaignID
    });
}

