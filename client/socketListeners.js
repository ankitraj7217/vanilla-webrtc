socket.on("availableOffers", offers => {
    console.log("Available Offers: ", offers);
    createOffersEls(offers);
})

socket.on("newOfferAwaiting", offers => {
    console.log("new Offers Awaiting: ", offers);
    createOffersEls(offers);
})

socket.on("answerResponse", (offerObj) => {
    console.log("received answer: ", offerObj);
    addAnswerFunc(offerObj);
})

socket.on("receiveIceCandidate", candidate => {
    addNewIceCandidate(candidate);
})

function createOffersEls (offers) {
    offers.forEach((offer) => {
        const newAnswerEl = document.createElement("button");
        newAnswerEl.innerText = offer.offererUserName;
        newAnswerEl.className = "call-btn answer";
        callDetailsSection.appendChild(newAnswerEl);
        newAnswerEl.addEventListener("click", () => answerOfferFunc(offer))
    })
}