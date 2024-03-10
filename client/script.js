const userName = "AR-" + Math.floor(Math.random() * 10000);

// Add your own codespace url and ensure to make port visibility public to share it with your friend
const socket = io.connect("localhost:3000", {
    auth: {
        userName
    }
});

const localVideoEl = document.querySelector("#my-video");
const remoteVideoEl = document.querySelector("#remote-video");
const callBtn = document.querySelector("#call");
const callDetailsSection = document.querySelector(".call-details");

let localStream, remoteStream;
let peerConnection;
let isOffer = true;

const createPeerConnection = async () => {
    try {
        const peerConfig = {
            iceServers: [
                {
                    urls: [
                        "stun:stun.l.google.com:19302",
                        "stun:stun1.l.google.com:19302"
                    ]
                }
            ]
        }
        peerConnection = await new RTCPeerConnection(peerConfig);
        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        })

        peerConnection.addEventListener("icecandidate", (e) => {
            console.log("Ice candidate found!");
            console.log(e)
            if (e.candidate) {
                socket.emit("sendIceCandidate", {
                    candidate: e.candidate,
                    candidateUserName: userName,
                    isOffer
                })
            }
        })

        // automatically gets remote tracks
        peerConnection.addEventListener("track", (e) => {
            remoteStream = new MediaStream();
            remoteVideoEl.srcObject = remoteStream;
            if (e.streams && e.streams.length) {
                e.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
            }
        })

    } catch (error) {
        console.log("Peer connect establishment failed: ", error)
    }
}

// will run while calling -> 1st user initiating call
const callFunc = async (e) => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideoEl.srcObject = localStream;

        await createPeerConnection();

        // create offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("newOffer", offer);
        console.log("offer: ", offer);

    } catch (error) {
        console.log("Error while calling function: ", error);
    }
}

const addAnswerFunc = async(offerObj) => {
    await peerConnection.setRemoteDescription(offerObj.answer);
}

// will run while answering -> current user is answerer.
const answerOfferFunc = async (offerObj) => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio:true
        });
        localVideoEl.srcObject = localStream;

        isOffer = false;
        await createPeerConnection();
        await peerConnection.setRemoteDescription(offerObj.offer);  // need to set this (have remote offer set) before creating answer
        const answer = await peerConnection.createAnswer({});
        await peerConnection.setLocalDescription(answer);  // requires this to trigger ice candidate call

        offerObj.answer = answer;
        // Sending offerObj so that answer is returned only to relevant sender.
        // Also, emittingwithAck such that we can receive a response of offerIceCandidate as it is already available
        const offerIceCandidates = await socket.emitWithAck("newAnswer", offerObj);
        offerIceCandidates.forEach((candidate) => {
            console.log("adding ice candidates: ", candidate);
            peerConnection.addIceCandidate(candidate);
        })

    } catch (error) {
        console.log("Error while creating answer to offer", error);
    }
}

const addNewIceCandidate = async (candidate) => {
    await peerConnection.addIceCandidate(candidate);
}

callBtn.addEventListener("click", callFunc);