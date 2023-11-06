window.onload = (event) => {
    const subscribed = document.querySelectorAll('.subscribed')
    for (const s of subscribed) {
        s.addEventListener('click', unsubscribe)
    }
    const unsubscribed = document.querySelectorAll('.unsubscribed')
    for (const s of unsubscribed) {
        s.addEventListener('click', subscribe)
    }
}

function unsubscribe(e) {
    const sensorName = document.querySelector(`#sensorName-${e.target.id}`).textContent;
    const sensorUri = document.querySelector(`#sensorUri-${e.target.id}`).textContent;
    const brokerUri = document.querySelector(`#brokerUri-${e.target.id}`).textContent;
    const topicUri = document.querySelector(`#topicUri-${e.target.id}`).textContent;
    const topicName = document.querySelectorAll(`.topicName.${e.target.classList[1]}.${e.target.classList[2]}`)[0].textContent;
    const qos = document.querySelectorAll(`.qos.${e.target.classList[2]}`)[0].textContent;

    fetch('/unsubscribe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ 
            sensorName,
            sensorUri,
            brokerUri,
            topicUri,
            topicName,
            qos
        })
    }).then(() => {
        alert('success!');
        window.location = '/home';
    }).catch(err => {
        alert(`something went wrong: ${err.message}`);
        window.location = '/error';
    })
}

function subscribe(e) {
    const sensorName = document.querySelector(`#sensorName-${e.target.classList[1]}`).textContent;
    const sensorUri = document.querySelector(`#sensorUri-${e.target.id}`).textContent;
    const brokerUri = document.querySelector(`#brokerUri-${e.target.id}`).textContent;
    const topicUri = document.querySelector(`#topicUri-${e.target.id}`).textContent;

    const topicName = document.querySelectorAll(`.topicName.${e.target.classList[1]}.${e.target.classList[2]}`)[0].textContent;
    const qos = document.querySelectorAll(`.qos.${e.target.classList[2]}`)[0].textContent;
    // console.log(sensorName, sensorUri, topicName, brokerUri, qos)
    fetch('/subscribe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ 
            sensorName,
            sensorUri,
            brokerUri,
            topicUri,
            topicName,
            qos
        })
    }).then(() => {
        alert('success!');
        window.location = '/home';
    }).catch(err => {
        alert(`something went wrong: ${err.message}`);
        window.location = '/error';
    })
}