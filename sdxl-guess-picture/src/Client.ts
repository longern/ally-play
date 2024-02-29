import { ReactNode, createElement, useEffect, useMemo, useState } from "react";

type Ctx = {
  numPlayers: number;
  playOrder: string[];
  isHost: boolean;
};

type GameMoveFunction<GameState> = (
  client: {
    G: GameState;
    ctx: Ctx;
    playerID: string;
  },
  ...args: any[]
) => void;

export type Game<
  GameState,
  GameMoves extends {
    [K in keyof GameMoves]: GameMoveFunction<GameState>;
  }
> = {
  setup: (ctx: any) => GameState;
  moves: GameMoves;
};

export type GameClientMoves<Moves> = {
  [K in keyof Moves]: (
    ...args: Moves[K] extends (client: any, ...args: infer I) => void
      ? I
      : never
  ) => void;
};

export type GameBoardComponent<T> = T extends Game<infer G, infer M>
  ? (props: { G: G; moves: GameClientMoves<M>; playerID: string }) => ReactNode
  : never;

export function makeGame<
  GameState,
  GameMoves extends Record<string, GameMoveFunction<GameState>>
>(game: Game<GameState, GameMoves>) {
  return game;
}

export function Client<T extends Game<any, any>>({
  game,
  board,
  socket,
}: {
  game: T;
  board: GameBoardComponent<T>;
  socket: WebSocket;
}): ReactNode {
  type GameState = ReturnType<T["setup"]>;
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [playerID, setPlayerID] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<string>) => {
      const message = JSON.parse(event.data);
      if (message.type === "setup") {
        const { playerID, ctx } = message;
        setCtx(ctx);
        setPlayerID(playerID);
        if (ctx.isHost) {
          const gameState = game.setup({ ctx });
          setGameState(gameState);
        }
      } else if (message.type === "sync") {
        setGameState(message.state);
      } else if (message.type === "action") {
        const { playerID } = message;
        const [func, ...args] = message.args;
        const newState = JSON.parse(JSON.stringify(gameState));
        game.moves[func]({ G: newState, ctx, playerID }, ...args);
        setGameState(newState);
      }
    };
    socket.addEventListener("message", handleMessage);
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [ctx, game, gameState, socket]);

  const moves = useMemo(
    () =>
      new Proxy(
        {},
        {
          get: (_, prop: string) => {
            return (...args: any[]) => {
              if (ctx.isHost)
                setGameState((value) => {
                  const G = JSON.parse(JSON.stringify(value));
                  game.moves[prop]({ G, ctx, playerID }, ...args);
                  return G;
                });
              else
                socket.send(
                  JSON.stringify({
                    type: "action",
                    args: [prop, ...args],
                  })
                );
            };
          },
        }
      ) as GameClientMoves<typeof game>,
    [game, ctx, playerID, socket]
  );

  useEffect(() => {
    if (!ctx?.isHost || !gameState) return;
    ctx.playOrder.forEach((player) => {
      if (player === playerID) return;
      socket.send(
        JSON.stringify({
          type: "sync",
          player,
          state: gameState,
        })
      );
    });
  }, [ctx, gameState, playerID, socket]);

  return gameState && createElement(board, { G: gameState, moves, playerID });
}
