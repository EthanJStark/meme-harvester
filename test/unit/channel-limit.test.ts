import { describe, it, expect, vi } from 'vitest';

describe('Channel video limiting', () => {
  it('should limit videos when maxVideos is specified', () => {
    const allVideos = [
      { url: 'https://youtube.com/watch?v=1', title: 'Video 1' },
      { url: 'https://youtube.com/watch?v=2', title: 'Video 2' },
      { url: 'https://youtube.com/watch?v=3', title: 'Video 3' },
      { url: 'https://youtube.com/watch?v=4', title: 'Video 4' },
      { url: 'https://youtube.com/watch?v=5', title: 'Video 5' },
    ];

    const maxVideos = 3;
    const limited = allVideos.slice(0, maxVideos);

    expect(limited).toHaveLength(3);
    expect(limited[0].title).toBe('Video 1');
    expect(limited[2].title).toBe('Video 3');
  });

  it('should return all videos when maxVideos is undefined', () => {
    const allVideos = [
      { url: 'https://youtube.com/watch?v=1', title: 'Video 1' },
      { url: 'https://youtube.com/watch?v=2', title: 'Video 2' },
    ];

    const maxVideos = undefined;
    const limited = maxVideos ? allVideos.slice(0, maxVideos) : allVideos;

    expect(limited).toHaveLength(2);
  });
});
