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

export interface Database {
  public: {
    Tables: {
      audio_files: {
        Row: AudioFile;
        Insert: Omit<AudioFile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AudioFile, 'id' | 'created_at'>>;
      };
      processing_jobs: {
        Row: ProcessingJob;
        Insert: Omit<ProcessingJob, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProcessingJob, 'id' | 'created_at'>>;
      };
    };
  };
} 