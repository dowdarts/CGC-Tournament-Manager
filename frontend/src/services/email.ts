import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Email notification service
export const EmailService = {
  async sendBoardCall(matchId: string, boardNumber: number, player1Email?: string, player2Email?: string) {
    try {
      const response = await api.post('/api/notifications/board-call', {
        matchId,
        boardNumber,
        player1Email,
        player2Email
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send board call email:', error);
      throw error;
    }
  }
};

export default api;
