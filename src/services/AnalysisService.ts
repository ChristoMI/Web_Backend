import axios from 'axios';

class AnalysisService {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async getCommentMood(comment: string) {
    const response = await axios.post(`${this.url}/analysis/comment`, { comment });
    return response.data;
  }
}

export default AnalysisService;