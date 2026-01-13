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
  storage_path: string;
  file_url: string;
  duration: number;
  file_size: number;
  created_at: string;
  updated_at: string;
  synced_to_desktop: boolean;
}

export interface ProcessingJob {
  id: string;
  user_id: string;
  video_storage_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  audio_file_id?: string;
  original_filename?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoFileData {
  uri: string;
  type: string;
  name: string;
  size?: number;
}

export type RootStackParamList = {
  Welcome: undefined;
  Main: undefined;
  Home: { user: User };
  Settings: { user: User };
  AudioPlayer: { file: AudioFile };
};
