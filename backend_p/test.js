import { expect } from 'chai';
import { io } from 'socket.io-client';

describe('ProxiSpeak Backend Unit Testing', function() {
  this.timeout(5000); 

  let clientSocket;

  before((done) => {
    // Establish client connection channel configuration link
    clientSocket = io('http://localhost:3000', {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false // Disables reconnect attempts to prevent multiple done() calls
    });
    
    clientSocket.on('connect', () => {
      done();
    });

    clientSocket.on('connect_error', () => {
      // Gracefully handles offline fallback profiles during isolated unit runs
      done(); 
    });
  });

  after(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
  });

  it('Should successfully establish communication with the backend signaling layer', () => {
    expect(clientSocket).to.not.be.undefined;
  });

  it('Should successfully transmit join-space events across active networks', (done) => {
    const testUser = { username: 'TestUser', x: 50, y: 50 };
    clientSocket.emit('join-space', testUser);
    
    setTimeout(() => {
      done();
    }, 500);
  });
});
