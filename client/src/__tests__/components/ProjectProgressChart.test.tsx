import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectProgressChart } from '../../components/dashboard/ProjectProgressChart';
import { Activity } from '@shared/schema';

describe('ProjectProgressChart', () => {
  it('renders without crashing when given valid activities', () => {
    // Mock activities data
    const activities: any[] = [
      {
        id: 1,
        projectId: 1,
        userId: 1,
        description: 'Created project',
        type: 'creation',
        entityType: 'project',
        entityId: 1,
        timestamp: new Date('2023-01-01'),
        user: {
          id: 1,
          username: 'testuser',
          fullName: 'Test User',
          email: 'test@example.com',
          role: 'admin',
          avatar: null
        }
      },
      {
        id: 2,
        projectId: 1,
        userId: 1,
        description: 'Updated project',
        type: 'update',
        entityType: 'project',
        entityId: 1,
        timestamp: new Date('2023-01-02'),
        user: {
          id: 1,
          username: 'testuser',
          fullName: 'Test User',
          email: 'test@example.com',
          role: 'admin',
          avatar: null
        }
      }
    ];

    // Render the component
    render(<ProjectProgressChart activities={activities} />);
    
    // Check that the chart title is displayed
    expect(screen.getByText(/Project Activity/i)).toBeInTheDocument();
    
    // Check that chart description is displayed
    expect(screen.getByText(/Activity trends over time/i)).toBeInTheDocument();
  });

  it('shows empty state when no activities are provided', () => {
    // Render with empty activities array
    render(<ProjectProgressChart activities={[]} />);
    
    // Check for empty state message
    expect(screen.getByText(/No activity data available/i)).toBeInTheDocument();
  });
});