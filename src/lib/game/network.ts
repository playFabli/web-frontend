export interface PlayerState {
	id: string;
	name: string;
	x: number;
	y: number;
	z: number;
	ry: number; // yaw rotation
}

type ClientMessage = { type: 'update'; x: number; y: number; z: number; ry: number };

type ServerMessage =
	| { type: 'welcome'; id: string; players: PlayerState[] }
	| { type: 'join'; player: PlayerState }
	| { type: 'leave'; id: string }
	| { type: 'state'; players: PlayerState[] };

const SEND_INTERVAL_MS = 50; // 20Hz, matches the server's broadcast tick rate

/**
 * Thin wrapper around a single WebSocket connection to the game server.
 * One connection = one player in one room (room = gameId). Deliberately
 * dumb: the client is trusted to report its own position (see server
 * README notes on the trusted-client MVP model and how to harden it later).
 */
export class GameNetwork {
	private ws: WebSocket | null = null;
	private lastSent = 0;
	public selfId = '';

	onWelcome?: (selfId: string, players: PlayerState[]) => void;
	onJoin?: (player: PlayerState) => void;
	onLeave?: (id: string) => void;
	onState?: (players: PlayerState[]) => void;
	onDisconnected?: () => void;

	connect(serverUrl: string, gameId: string, name: string) {
		const url = `${serverUrl}?gameId=${encodeURIComponent(gameId)}&name=${encodeURIComponent(name)}`;
		this.ws = new WebSocket(url);

		this.ws.onmessage = (ev) => {
			const msg: ServerMessage = JSON.parse(ev.data);
			switch (msg.type) {
				case 'welcome':
					this.selfId = msg.id;
					this.onWelcome?.(msg.id, msg.players);
					break;
				case 'join':
					this.onJoin?.(msg.player);
					break;
				case 'leave':
					this.onLeave?.(msg.id);
					break;
				case 'state':
					this.onState?.(msg.players);
					break;
			}
		};

		this.ws.onclose = () => this.onDisconnected?.();
		this.ws.onerror = () => this.onDisconnected?.();
	}

	/** Call every frame; internally throttled to SEND_INTERVAL_MS. */
	sendUpdate(x: number, y: number, z: number, ry: number) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
		const now = performance.now();
		if (now - this.lastSent < SEND_INTERVAL_MS) return;
		this.lastSent = now;
		const msg: ClientMessage = { type: 'update', x, y, z, ry };
		this.ws.send(JSON.stringify(msg));
	}

	disconnect() {
		this.ws?.close();
		this.ws = null;
	}
}
