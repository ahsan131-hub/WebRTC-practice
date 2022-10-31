"use strict";
const callButton = document.getElementById("startCall");
const hangUp = document.getElementById("hangUpCall");
const endCall = document.getElementById("endCall");

const mediaStreamConstraints = {
    video: {
        width: {
            min: 1280,
        },
        height: {
            min: 720,
        },
    },
};
const offerOptions = {
    offerToReceiveVideo: 1
}
const remoteVideo = document.getElementById("remoteVideo")
const localVideo = document.getElementById("localVideo")
let localStream;
let remoteStream;

let localPeerConnection;
let remotePeerConnection;

let startTime = null;
localPeerConnection = new RTCPeerConnection();
localPeerConnection.addEventListener("icecandidate", handleConnection);


// above I have defined all the variable that will be required to develop P2P video streams
// below I will write the actual logic for streaming.

const gotLocalMediaStream = (event) => {
    localVideo.srcObject = event.stream
    localStream = event.stream;
    trace("Received the Local Media Stream.")
    callButton.disabled = true
}

const getRemoteMediaStream = (event) => {
    remoteStream.srcObject = event.stream
    remoteStream = event.stream;
    trace("Received Remote Stream")
}

const handleLocalMediaStreamErrors = (error) => {
    trace(`navigator.getUSerMedia error: ${error.toString()}`)
}


// Add behavior for video streams.
const logVideoLoaded = (event) => {
    const video = event.target;
    trace(`Loaded Video with id: ${video.id} and size: (${video.height} , ${video.width})`)
}

// fired when the video is begins streaming
const logResizedVideo = (event) => {
    logVideoLoaded(event)
    if (startTime) {
        const elapseTime = window.performance.now() - startTime
        startTime = null
        trace(`Setup time: ${elapseTime.toFixed(3)}ms`)
    }
}

localVideo.addEventListener("loadedmetadata", logVideoLoaded)
remoteVideo.addEventListener("loadedmetadata", logVideoLoaded)
remoteVideo.addEventListener("resize", logResizedVideo)


const handleConnection = (event) => {
    const peerConnection = event.target
    const iceCondidate = event.condidate

    if (iceCondidate) {
        const newIceCondidate = new RTCPeerConnection(iceCondidate)
        const otherPeer = getOtherPeer(peerConnection)

        otherPeer.addIceCandidate(newIceCondidate).then(
            () => {
                handleConnectionSuccess(peerConnection)
            }
        ).catch((err) => {
            handleConnectionFailure(peerConnection, err)
        })
    }
    trace(`${getPeerName(peerConnection)} ICE candidate:\n` +
        `${event.candidate.candidate}.`);
}


const handleConnectionChange = (event) => {
    const peerConnection = event.target
    console.log("ICE state change event:", event)
    trace(`${getPeerName(peerConnection)} ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
}

// Logs success when localDescription is set.
function setLocalDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

// Logs success when remoteDescription is set.
function setRemoteDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

const createOffer = (description) => {
    trace(`Offer dfrom localPeerConnection: \n ${
        description.sdp
    }`)
    trace("Local Peer Connection setLocalDescription start.")
    localPeerConnection.setLocalDescription(description).then(() => {
            setLocalDescriptionSuccess(localPeerConnection)
        }
    ).catch(setSessionDescriptionError)

    trace("answer creating started")

    remotePeerConnection.createAnswer()
        .then(createdAnswer).catch(setSessionDescriptionError)
}

const createdAnswer = description => {
    trace(`Answer from remotePeerConnection:\n${description.sdp}.`);

    trace('remotePeerConnection setLocalDescription start.');

    remotePeerConnection.setLocalDescription(description).then(
        () => {
            setLocalDescriptionSuccess(remotePeerConnection)
        }
    ).catch(setSessionDescriptionError)

    trace('localPeerConnection setRemoteDescription start.');
    localPeerConnection.setRemoteDescription(description).then(() => {
        setLocalDescriptionSuccess(localPeerConnection)
    }).catch(setSessionDescriptionError)
}

const startAction = () => {
    startButton.disabled = true
    navigator.mediaDevices
        .getUserMedia(mediaStreamConstraints)
        .then(gotLocalMediaStream)
        .catch(handleLocalMediaStreamErrors);
    trace('Requesting local stream.');
}


// Handles call button action: creates peer connection.
function callAction() {
    callButton.disabled = true;
    hangupButton.disabled = false;

    trace('Starting call.');
    startTime = window.performance.now();

    // Get local media stream tracks.
    const videoTracks = localStream.getVideoTracks();
    const audioTracks = localStream.getAudioTracks();
    if (videoTracks.length > 0) {
        trace(`Using video device: ${videoTracks[0].label}.`);
    }
    if (audioTracks.length > 0) {
        trace(`Using audio device: ${audioTracks[0].label}.`);
    }

    const servers = null;  // Allows for RTC server configuration.

    // Create peer connections and add behavior.
    localPeerConnection = new RTCPeerConnection(servers);
    trace('Created local peer connection object localPeerConnection.');

    localPeerConnection.addEventListener('icecandidate', handleConnection);
    localPeerConnection.addEventListener(
        'iceconnectionstatechange', handleConnectionChange);

    remotePeerConnection = new RTCPeerConnection(servers);
    trace('Created remote peer connection object remotePeerConnection.');

    remotePeerConnection.addEventListener('icecandidate', handleConnection);
    remotePeerConnection.addEventListener(
        'iceconnectionstatechange', handleConnectionChange);
    remotePeerConnection.addEventListener('addstream', gotRemoteMediaStream);

    // Add local stream to connection and create offer to connect.
    localPeerConnection.addStream(localStream);
    trace('Added local stream to localPeerConnection.');

    trace('localPeerConnection createOffer start.');
    localPeerConnection.createOffer(offerOptions)
        .then(createdOffer).catch(setSessionDescriptionError);
}


// Helper Functions

// get other Peer Connect ttion name
const getPeerName = (peerConnection) => {
    return (peerConnection === localPeerConnection) ? "local Peer Connection" : "Remote Peer Connection"
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
    trace(`Failed to create session description: ${error.toString()}.`);
}

// Logs success when setting session description.
function setDescriptionSuccess(peerConnection, functionName) {
    const peerName = getPeerName(peerConnection);
    trace(`${peerName} ${functionName} complete.`);
}


// Logs an action (text) and the time when it happened on the console.
function trace(text) {
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);
    console.log(now, text);
}

// Logs that the connection succeeded.
function handleConnectionSuccess(peerConnection) {
    trace(`${getPeerName(peerConnection)} addIceCandidate success.`);
}

// Logs that the connection failed.
function handleConnectionFailure(peerConnection, error) {
    trace(`${getPeerName(peerConnection)} failed to add ICE Candidate:\n` +
        `${error.toString()}.`);
}
