import React from 'react';
import { TextStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: TextStyle;
}

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  color = '#FFFFFF', 
  style 
}) => {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={style}
    />
  );
};

// Pre-defined icon components for common use cases
export const PlayIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="play" {...props} />
);

export const PauseIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="pause" {...props} />
);

export const SettingsIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="settings-outline" {...props} />
);

export const CameraIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="camera-outline" {...props} />
);

export const MusicalNotesIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="musical-notes-outline" {...props} />
);

export const LinkIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="link-outline" {...props} />
);

export const DownloadIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="download-outline" {...props} />
);

export const ArrowBackIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="arrow-back" {...props} />
);

export const CheckmarkIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="checkmark-circle" {...props} />
);

export const CloseIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="close-circle" {...props} />
); 