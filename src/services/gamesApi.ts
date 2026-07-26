import { apiRequest } from './api';

export interface LoveChallenge {
  id: string;
  creatorId: string;
  question: string;
  options: string[];
  correctIdx: number;
  answeredIdx: number | null;
  createdAt: string;
}

export interface TicTacToeGame {
  id: string;
  board: string[];
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DECLINED';
  invitedById: string | null;
  declinedById: string | null;
  turnUserId: string;
  playerXId: string;
  playerOId: string;
  winnerId: string | null;
  isDraw: boolean;
  rematchNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface GamesState {
  scores: { self: number; partner: number };
  loveChallenges: LoveChallenge[];
  ticTacToe: TicTacToeGame | null;
  ticTacToeScores: { self: number; partner: number };
}

export const gamesApi = {
  async getState(): Promise<GamesState> {
    return apiRequest<GamesState>('/games/state');
  },

  async createLoveChallenge(payload: {
    question: string;
    options: string[];
    correctIdx: number;
  }): Promise<{ challenge: LoveChallenge }> {
    return apiRequest<{ challenge: LoveChallenge }>('/games/love-challenge', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async answerLoveChallenge(
    id: string,
    answeredIdx: number
  ): Promise<{ challenge: LoveChallenge }> {
    return apiRequest<{ challenge: LoveChallenge }>(`/games/love-challenge/${id}/answer`, {
      method: 'POST',
      body: JSON.stringify({ answeredIdx }),
    });
  },

  async inviteTicTacToe(): Promise<{ game: TicTacToeGame }> {
    return apiRequest<{ game: TicTacToeGame }>('/games/tictactoe/invite', {
      method: 'POST',
    });
  },

  async acceptTicTacToeInvite(id: string): Promise<{ game: TicTacToeGame }> {
    return apiRequest<{ game: TicTacToeGame }>(`/games/tictactoe/${id}/accept`, {
      method: 'POST',
    });
  },

  async declineTicTacToeInvite(id: string): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(`/games/tictactoe/${id}/decline`, {
      method: 'POST',
    });
  },

  async endTicTacToe(id: string): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(`/games/tictactoe/${id}/end`, {
      method: 'POST',
    });
  },

  async rematchTicTacToe(id: string): Promise<{ game: TicTacToeGame }> {
    return apiRequest<{ game: TicTacToeGame }>(`/games/tictactoe/${id}/rematch`, {
      method: 'POST',
    });
  },

  async makeTicTacToeMove(cellIdx: number): Promise<{ game: TicTacToeGame }> {
    return apiRequest<{ game: TicTacToeGame }>('/games/tictactoe/move', {
      method: 'POST',
      body: JSON.stringify({ cellIdx }),
    });
  },
};
