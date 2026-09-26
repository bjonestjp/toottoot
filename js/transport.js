/**
 * transport.js
 * Real-time messaging transport using MQTT over Secure WebSockets (WSS).
 * Bypasses all WebRTC NAT/firewall negotiation issues on cellular and Wi-Fi networks.
 */

const BROKER = 'broker.hivemq.com';
const PORT = 8884;
const PATH = '/mqtt';
const TOPIC_PREFIX = 'toot-game';

/**
 * Host transport: listens for player actions, sends targeted or broadcast messages.
 */
export class HostTransport {
  constructor(roomCode, { onPlayerMessage, onReady, onError }) {
    this.roomCode = roomCode.toUpperCase().trim();
    this.clientId = `toot_host_${this.roomCode}_${Math.random().toString(36).substring(2, 8)}`;
    this.client = new Paho.MQTT.Client(BROKER, PORT, PATH, this.clientId);
    this.onPlayerMessage = onPlayerMessage;
    this.connected = false;

    this.client.onConnectionLost = (resp) => {
      console.warn('Host transport connection lost:', resp);
      this.connected = false;
      setTimeout(() => this.connect(), 2000);
    };

    this.client.onMessageArrived = (msg) => {
      try {
        const payload = JSON.parse(msg.payloadString);
        if (this.onPlayerMessage) {
          this.onPlayerMessage(payload.senderId, payload);
        }
      } catch (err) {
        console.error('Failed to parse incoming message on host:', err);
      }
    };

    this.connect(onReady, onError);
  }

  connect(onReady, onError) {
    this.client.connect({
      useSSL: true,
      cleanSession: true,
      keepAliveInterval: 30,
      onSuccess: () => {
        this.connected = true;
        const hostTopic = `${TOPIC_PREFIX}/${this.roomCode}/host`;
        this.client.subscribe(hostTopic, { qos: 1 });
        console.log('Host transport connected and listening on:', hostTopic);
        if (onReady) onReady();
      },
      onFailure: (err) => {
        console.error('Host transport connect failed:', err);
        if (onError) onError(err);
      }
    });
  }

  // Send message to a specific player
  sendToPlayer(playerId, msg) {
    if (!this.connected) return;
    const topic = `${TOPIC_PREFIX}/${this.roomCode}/player/${playerId}`;
    const m = new Paho.MQTT.Message(JSON.stringify(msg));
    m.destinationName = topic;
    m.qos = 1;
    this.client.send(m);
  }

  // Broadcast message to all players
  broadcast(msg) {
    if (!this.connected) return;
    const topic = `${TOPIC_PREFIX}/${this.roomCode}/all`;
    const m = new Paho.MQTT.Message(JSON.stringify(msg));
    m.destinationName = topic;
    m.qos = 1;
    this.client.send(m);
  }

  destroy() {
    try {
      this.connected = false;
      this.client.disconnect();
    } catch (e) {}
  }
}

/**
 * Player transport: connects to room, communicates with host.
 */
export class PlayerTransport {
  constructor(roomCode, playerName, { onMessage, onReady, onError }) {
    this.roomCode = roomCode.toUpperCase().trim();
    this.playerName = playerName;
    this.playerId = 'p_' + Math.random().toString(36).substring(2, 10);
    this.clientId = `toot_player_${this.playerId}`;
    this.client = new Paho.MQTT.Client(BROKER, PORT, PATH, this.clientId);
    this.onMessage = onMessage;
    this.connected = false;

    this.client.onConnectionLost = (resp) => {
      console.warn('Player transport connection lost:', resp);
      this.connected = false;
      setTimeout(() => this.connect(), 1500);
    };

    this.client.onMessageArrived = (msg) => {
      try {
        const payload = JSON.parse(msg.payloadString);
        if (this.onMessage) {
          this.onMessage(payload);
        }
      } catch (err) {
        console.error('Failed to parse incoming message on player:', err);
      }
    };

    this.connect(onReady, onError);
  }

  connect(onReady, onError) {
    this.client.connect({
      useSSL: true,
      cleanSession: true,
      keepAliveInterval: 30,
      onSuccess: () => {
        this.connected = true;
        const allTopic = `${TOPIC_PREFIX}/${this.roomCode}/all`;
        const directTopic = `${TOPIC_PREFIX}/${this.roomCode}/player/${this.playerId}`;
        
        this.client.subscribe(allTopic, { qos: 1 });
        this.client.subscribe(directTopic, { qos: 1 });
        
        console.log('Player transport connected as', this.playerId);
        
        // Notify host that player joined
        this.sendToHost({ type: 'join', name: this.playerName });
        if (onReady) onReady(this.playerId);
      },
      onFailure: (err) => {
        console.error('Player transport connect failed:', err);
        if (onError) onError(err);
      }
    });
  }

  sendToHost(msg) {
    if (!this.connected) return;
    const topic = `${TOPIC_PREFIX}/${this.roomCode}/host`;
    const payload = { ...msg, senderId: this.playerId };
    const m = new Paho.MQTT.Message(JSON.stringify(payload));
    m.destinationName = topic;
    m.qos = 1;
    this.client.send(m);
  }

  destroy() {
    try {
      this.connected = false;
      this.client.disconnect();
    } catch (e) {}
  }
}
