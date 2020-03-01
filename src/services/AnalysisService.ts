import axios from 'axios';

type CommentMoodPayload = {
  comment: string;
}

class AnalysisService {
  private url: string;

  constructor() {
    this.url = process.env.AnalysisServerUrl!;
  }

  async getCommentMood(payload: CommentMoodPayload) {
    const response = await axios.post(`${this.url}/analysis/comment`, payload);
    return response.data;
  }
}

export default AnalysisService;