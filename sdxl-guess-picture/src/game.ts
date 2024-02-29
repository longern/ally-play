import { makeGame } from "./Client";

export type GameState = {
  stage: "upload" | "pick" | "confuse" | "guess" | "reveal";
  description: string;
  players: Record<
    string,
    { score: number; hand: string[]; guess: number | undefined }
  >;
  board: { playerID: string; picture: string }[];
  currentPlayer: string;
};

export const GuessPicture = makeGame({
  setup: ({ ctx }) => {
    return {
      stage: "upload",
      description: "",
      players: Object.fromEntries(
        ctx.playOrder.map((player) => [
          player,
          { score: 0, hand: [], guess: undefined },
        ])
      ),
      board: [],
      currentPlayer: ctx.playOrder[0],
    } as GameState;
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
      const handIndex = G.players[playerID].hand.indexOf(picture);
      G.players[playerID].hand.splice(handIndex, 1);
      G.stage = "confuse";
    },

    pickConfusingPicture({ G, playerID }, picture: string) {
      if (G.stage !== "confuse") return;
      if (Object.values(G.board).some((p) => p.playerID === playerID)) return;
      const boardLength = G.board.length;
      const insertIndex = Math.floor(Math.random() * (boardLength + 1));
      G.board.splice(insertIndex, 0, { playerID, picture });
      const handIndex = G.players[playerID].hand.indexOf(picture);
      G.players[playerID].hand.splice(handIndex, 1);
      if (boardLength + 1 === Object.keys(G.players).length) {
        G.stage = "guess";
      }
    },

    guess({ G, playerID }, guess: number) {
      if (G.stage !== "guess") return;

      G.players[playerID].guess = guess;
      const guesses = Object.fromEntries(
        Object.entries(G.players)
          .filter(([playerID]) => playerID !== G.currentPlayer)
          .map(([playerID, value]) => [playerID, value.guess])
      );

      if (!Object.values(guesses).every((guess) => guess !== undefined)) return;

      // Everyone has made a guess
      G.stage = "reveal";

      const answer = G.board.findIndex((p) => p.playerID === G.currentPlayer);
      if (
        Object.values(guesses).every((guess) => guess === answer) ||
        Object.values(guesses).every((guess) => guess !== answer)
      ) {
        for (const p in guesses) {
          G.players[p].score += 2;
        }
      } else {
        let scores: Record<string, number> = {};
        for (const p in guesses) {
          if (guesses[p] === answer) {
            scores[p] = (scores[p] || 0) + 2;
            scores[G.currentPlayer] = (scores[G.currentPlayer] || 0) + 1;
          } else {
            const owner = G.board[G.players[p].guess].playerID;
            scores[owner] = (scores[owner] || 0) + 1;
          }
        }
        for (const p in scores) {
          G.players[p].score += scores[p];
        }
      }
    },

    nextRound({ G, ctx: { playOrder } }) {
      if (G.stage !== "reveal") return;
      G.stage = "upload";
      G.description = "";
      G.board = [];
      for (const playerID in G.players) {
        G.players[playerID].guess = undefined;
      }
      const currentPlayerIndex = playOrder.indexOf(G.currentPlayer);
      G.currentPlayer = playOrder[(currentPlayerIndex + 1) % playOrder.length];
    },
  },
});
