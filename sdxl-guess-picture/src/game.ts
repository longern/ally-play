export type GameState = {
  stage: "upload" | "pick" | "confuse" | "guess" | "reveal";
  description: string;
  players: Record<string, { score: number; hand: any[]; guess: number }>;
  board: { playerID: string; picture: string }[];
};

type Client = { G: GameState; playerID: string };

export const Game = {
  setup: () => {
    return {
      stage: "pick",
      description: "",
      players: {},
      board: [],
    } as GameState;
  },

  moves: {
    uploadPicture({ G, playerID }: Client, picture: string) {
      if (G.stage !== "upload") return;
      if (G.players[playerID].hand.length >= 6) return;
      G.players[playerID].hand.push(picture);
      if (Object.values(G.players).every((p) => p.hand.length === 6)) {
        G.stage = "pick";
      }
    },

    pickPicture({ G, playerID }: Client, picture: string, description: string) {
      if (G.stage !== "pick") return;
      G.description = description;
      G.board.push({ playerID, picture });
      G.stage = "confuse";
    },

    pickConfusingPicture({ G, playerID }: Client, picture: string) {
      if (G.stage !== "confuse") return;
      if (Object.values(G.board).some((p) => p.playerID === playerID)) return;
      const insertIndex = Math.floor(Math.random() * (G.board.length + 1));
      G.board.splice(insertIndex, 0, { playerID, picture });
      if (G.board.length === Object.keys(G.players).length) {
        G.stage = "guess";
      }
    },

    guess({ G, playerID }: Client, guess: number) {
      if (G.stage !== "guess") return;
      G.players[playerID].guess = guess;
      if (Object.values(G.players).every((p) => p.guess)) {
        G.stage = "reveal";
      }
    },

    nextRound({ G }: Client) {
      G.stage = "upload";
      G.description = "";
      G.board = [];
      for (const playerID in G.players) {
        G.players[playerID].guess = 0;
      }
    },
  },
};
