import { createElement, useEffect, useMemo, useState } from "react";

type Ctx = {
  numPlayers: number;
  playerID: string;
  isHost: boolean;
};

export type Game<GameState = any> = {
  setup: ({ ctx }: { ctx: Ctx }) => GameState;
  moves: Record<
    string,
    (
      client: {
        G: GameState;
        ctx: Ctx;
        playerID: string;
      },
      ...args: any[]
    ) => void
  >;
};

export type GameMoves<T extends Game> = {
  [K in keyof T["moves"]]: (
    ...args: T["moves"][K] extends (client: any, ...args: infer I) => void
      ? I
      : []
  ) => void;
};

export function Client<GameState>({
  game,
  board,
  socket,
}: {
  game: Game<GameState>;
  board: any;
  socket: WebSocket;
}) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [ctx, setCtx] = useState<Ctx>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<string>) => {
      const message = JSON.parse(event.data);
      if (message.type === "setup") {
        const { type, ...setupCtx } = message;
        setCtx(setupCtx);
        if (setupCtx.isHost) {
          const gameState = game.setup({ ctx: setupCtx });
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
                  const gameState = JSON.parse(JSON.stringify(value));
                  game.moves[prop](
                    { G: gameState, ctx, playerID: ctx.playerID },
                    ...args
                  );
                  return gameState;
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
      ),
    [game, ctx, socket]
  );

  useEffect(() => {
    if (!ctx?.isHost || !gameState) return;
    Array.from({ length: ctx.numPlayers - 1 }).forEach((_, i) => {
      socket.send(
        JSON.stringify({
          type: "sync",
          playerID: (i + 1).toString(),
          state: gameState,
        })
      );
    });
  }, [ctx, gameState, socket]);

  return (
    gameState &&
    createElement(board, { G: gameState, moves, playerID: ctx.playerID })
  );
}
