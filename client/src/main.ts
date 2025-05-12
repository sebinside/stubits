document.querySelector("#app")!.innerHTML = `Test Test ABC`

let socket : WebSocket;
socket = new WebSocket('ws://localhost:42580');

  socket.addEventListener('open', () => {
    console.log('Connected to WebSocket server');
    socket.send('Hello from client!');
    socket.send("WHAAAAUPP")
  });

  socket.addEventListener('message', (event) => {
    console.log('Message from server:', event.data);
  });

  socket.addEventListener('close', () => {
    console.log('WebSocket connection closed');
  });

  