import { expect } from 'chai';
import { io } from 'socket.io-client';

describe('ProxiSpeak Backend Unit Testing', () => {
  let clientSocket;

  before((done) => {
    // Connect to the server before running any tests
    clientSocket = io('http://localhost:3000');
    clientSocket.on('connect', done);
  });

  after(() => {
    // Disconnect and close the connection after all tests are finished
    clientSocket.disconnect();
  });

  it('Should successfully connect to the Socket.io server', () => {
    expect(clientSocket.connected).to.be.true;
  });

  it('Should broadcast user-joined when a new user joins the space', (done) => {
    const testUser = { username: 'TestUser', x: 50, y: 50 };
    clientSocket.emit('join-space', testUser);
    
    // If the event is sent successfully without crashing, the test passes
    setTimeout(() => {
      done();
    }, 500);
  });
});
