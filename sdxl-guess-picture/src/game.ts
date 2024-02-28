import type { Game } from "./Client";

export type GameState = {
  stage: "upload" | "pick" | "confuse" | "guess" | "reveal";
  description: string;
  players: Record<string, { score: number; hand: any[]; guess: number }>;
  board: { playerID: string; picture: string }[];
};

export const GuessPicture: Game<GameState> = {
  setup: ({ ctx }) => {
    return {
      stage: "upload",
      description: "",
      players: Object.fromEntries(
        Array.from({ length: ctx.numPlayers }, (_, i) => [
          i.toString(),
          { score: 0, hand: [], guess: 0 },
        ])
      ),
      board: [],
    };
  },

  moves: {
    uploadPictures({ G, playerID }, pictures: string[]) {
      if (G.stage !== "upload") return;
      if (G.players[playerID].hand.length >= 6) return;
      pictures.splice(6 - G.players[playerID].hand.length);
      G.players[playerID].hand.push(...pictures);
      if (Object.values(G.players).every((p) => p.hand.length === 6)) {
        G.stage = "pick";
      }
    },

    pickPicture({ G, playerID }, picture: string, description: string) {
      if (G.stage !== "pick") return;
      G.description = description;
      G.board.push({ playerID, picture });
      G.stage = "confuse";
    },

    pickConfusingPicture({ G, playerID }, picture: string) {
      if (G.stage !== "confuse") return;
      if (Object.values(G.board).some((p) => p.playerID === playerID)) return;
      const boardLength = G.board.length;
      const insertIndex = Math.floor(Math.random() * (boardLength + 1));
      G.board.splice(insertIndex, 0, { playerID, picture });
      if (boardLength + 1 === Object.keys(G.players).length) {
        G.stage = "guess";
      }
    },

    guess({ G, playerID }, guess: number) {
      if (G.stage !== "guess") return;
      G.players[playerID].guess = guess;
      if (Object.values(G.players).every((p) => p.guess)) {
        G.stage = "reveal";
      }
    },

    nextRound({ G }) {
      G.stage = "upload";
      G.description = "";
      G.board = [];
      for (const playerID in G.players) {
        G.players[playerID].guess = 0;
      }
    },
  },
};
