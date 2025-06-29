export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface AudioFile {
  id: string;
  user_id: string;
  title: string;
  filename: string;
  source_url: string;
  file_url: string;
  duration?: number;
  file_size?: number;
  created_at: string;
  updated_at: string;
}

export interface ShareData {
  type: 'text' | 'url';
  data: string;
}

export interface ProcessingJob {
  id: string;
  user_id: string;
  video_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  audio_file_id?: string;
  created_at: string;
  updated_at: string;
}

export type RootStackParamList = {
  Welcome: undefined;
  Main: undefined;
  Home: { user: User };
  ManualInput: { user: User };
  Settings: { user: User };
  AudioPlayer: { file: AudioFile };
  Processing: { url: string };
}; 