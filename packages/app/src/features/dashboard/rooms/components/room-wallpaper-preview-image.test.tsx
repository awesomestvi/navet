import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoomWallpaperPreviewImage } from './room-wallpaper-preview-image';

describe('RoomWallpaperPreviewImage', () => {
  it('renders safe custom image URLs without sending a referrer', () => {
    render(
      <RoomWallpaperPreviewImage value="https://images.example.com/room.jpg" alt="Room preview" />
    );

    expect(screen.getByRole('img', { name: 'Room preview' })).toHaveAttribute(
      'src',
      'https://images.example.com/room.jpg'
    );
    expect(screen.getByRole('img', { name: 'Room preview' })).toHaveAttribute(
      'referrerpolicy',
      'no-referrer'
    );
  });

  it('does not render unsafe custom protocols', () => {
    const { container } = render(
      <RoomWallpaperPreviewImage value="javascript:alert(1)" alt="Unsafe preview" />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('removes a failed image and recovers when the source changes', () => {
    const { rerender } = render(
      <RoomWallpaperPreviewImage value="https://images.example.com/missing.jpg" alt="Preview" />
    );

    fireEvent.error(screen.getByRole('img', { name: 'Preview' }));
    expect(screen.queryByRole('img', { name: 'Preview' })).not.toBeInTheDocument();

    rerender(
      <RoomWallpaperPreviewImage value="https://images.example.com/recovered.jpg" alt="Preview" />
    );
    expect(screen.getByRole('img', { name: 'Preview' })).toHaveAttribute(
      'src',
      'https://images.example.com/recovered.jpg'
    );
  });
});
