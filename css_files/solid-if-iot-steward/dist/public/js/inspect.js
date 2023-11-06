// let k = 0;
// let kList = [];


function addTopic() {
  const topicsDiv = document.querySelector('#topics');
  const el = document.createElement('div');
  el.className = 'topicInput';

  const topicLabel = document.createElement('label');
  topicLabel.for = 'sensorTopic';
  topicLabel.textContent = 'Topic: ';

  const topicInput = document.createElement('input');
  topicInput.className = 'topic';
  topicInput.type = 'text';

  const qosLabel = document.createElement('label');
  qosLabel.for = 'qos';
  qosLabel.textContent = 'qos: ';

  const qosList = document.createElement('select');
  qosList.className = 'qos';

  const qosOptions = [0, 1, 2];
  for (const opt of qosOptions) {
    let opEl = document.createElement('option');
    opEl.value = opt
    opEl.textContent = opt
    qosList.appendChild(opEl)
  }

  const typeLabel = document.createElement('label');
  typeLabel.for = 'topicType';
  typeLabel.textContent = 'Topic Type: ';

  const typeList = document.createElement('select');
  typeList.className = 'topicType';

  const options = ['subscribe', 'publish']
  for (const opt of options) {
    let opEl = document.createElement('option');
    opEl.value = opt
    opEl.textContent = opt
    typeList.appendChild(opEl)
  }
  el.appendChild(topicLabel)
  el.appendChild(topicInput)
  el.appendChild(typeLabel);
  el.appendChild(typeList);
  el.appendChild(qosLabel);
  el.appendChild(qosList);
  topicsDiv.appendChild(el);
}

function sendForm() {
  const divs = document.querySelectorAll('.topicInput');
  const topics = [];
  for (const divEl of divs) {
    const topicName = divEl.querySelectorAll('.topic')[0].value;
    const topicType = divEl.querySelectorAll('.topicType')[0].value;
    const qos = divEl.querySelectorAll('.qos')[0].value;
    topics.push({ topicName, topicType, qos })
  }
  const FD = new FormData(form);
  let data = Object.fromEntries(FD);
  data = { ...data, topics };
  console.log(data);
  fetch("/add_sensor", {
    method: "POST",
    mode: "cors",
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).then((res) => { alert('success!') }).catch((err) => { alert(err) });

}
const form = document.querySelector('#add_sensor');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  sendForm();
})