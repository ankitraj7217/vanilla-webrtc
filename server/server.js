import { Server } from "socket.io";

const io = new Server({
    cors: {
        origin: "*", // Allow requests from any origin
        methods: ["GET", "POST"], // Allow only GET and POST methods
        allowedHeaders: ["Content-Type", "Authorization", "X-Custom-Header"],
        credentials: true // Allow credentials (cookies, authorization headers, etc.)
      }
})

const offers = [];  // {offererUserName, offer, offerIceCandidates, answererUserName, answer, answerIceCandidates}
const connectedSockets = [];  // userName, socket.id

io.on("connection", (socket) => {
    const userName = socket.handshake.auth.userName;
    // can check with auth code too and disconnect if it doesn't match
    console.log("Connected: ", userName);
    connectedSockets.push({socketId: socket.id, userName});

    if (offers.length) {
        // whenever it joins..it checks if there are available offers. only once in lifetime.
        socket.emit("availableOffers", offers);
    }

    socket.on("newOffer", newOffer => {
        offers.push({
            offererUserName: userName,
            offer: newOffer,
            offerIceCandidates: [],
            answererUserName: null,
            answer: null,
            answerIceCandidates: []
        })

        socket.broadcast.emit("newOfferAwaiting", offers.slice(-1));
    }) 

    socket.on("newAnswer", (newAnswer, ackFunc) => {
        const socketToAnswer = connectedSockets.find((socket) => socket.userName === newAnswer.offererUserName);
        if (!socketToAnswer) return;
        const socketIdToAnswer = socketToAnswer.socketId;

        const offerToUpdate = offers.find((offer) => offer.offererUserName === newAnswer.offererUserName);
        if (!offerToUpdate) return;
        ackFunc(offerToUpdate.offerIceCandidates); // send back offer ice candidates already collected

        offerToUpdate.answer = newAnswer.answer;
        offerToUpdate.answererUserName = userName;

        socket.to(socketIdToAnswer).emit("answerResponse", offerToUpdate);
    })
    
    socket.on("sendIceCandidate", iceCandidate => {
        const {candidateUserName, candidate, isOffer} = iceCandidate;
    
        if (isOffer) {
            const offerObj = offers.find(o => o.offererUserName === candidateUserName);
            if (!offerObj) return;
            offerObj.offerIceCandidates.push(candidate);

            // Emit to answer -> although this is useless. 
            // Answerer will already get from ackFunc from top and answerer is not added anyway till now.
            if (offerObj.answererUserName) {
                const socketToSendTo = connectedSockets.find(s => s.userName === offerObj.answererUserName);
                if (!socketToSendTo) return;
                socket.to(socketToSendTo.socketId).emit("receiveIceCandidate", candidate);
            }
        } else {
            const answerObj = offers.find(o => o.answererUserName === candidateUserName);
            if (!answerObj) return;
            answerObj.answerIceCandidates.push(candidate);

            // Return back ice candidate to offer ice candidate
            if (answerObj.offererUserName) {
                console.log("sending candidate 76", userName, socket.id)
                const socketToSendTo = connectedSockets.find(s => s.userName === answerObj.offererUserName);
                if (!socketToSendTo) return;
                console.log("sending candidate", socketToSendTo, connectedSockets)
                socket.to(socketToSendTo.socketId).emit("receiveIceCandidate", candidate);
            }
        }
    })
})

io.listen(3000);