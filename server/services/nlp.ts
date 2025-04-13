import { Project, Task, Document, Activity } from "@shared/schema";

type AnalysisResult = {
  summary: string;
  insights: Insight[];
  status: string;
  recommendations: string[];
};

export type Insight = {
  type: 'warning' | 'success' | 'info';
  content: string;
  confidence: number;
  source?: string;
};

export async function analyzeProjectData(
  project: Project,
  tasks: Task[],
  documents: Document[],
  activities: Activity[]
): Promise<AnalysisResult> {
  // Calculate basic metrics
  const activeTasks = tasks.filter(task => task.status !== 'completed');
  const completedTasks = tasks.filter(task => task.status === 'completed');
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

  // Group tasks by team
  const tasksByTeam = tasks.reduce((acc, task) => {
    if (!task.teamId) return acc;
    acc[task.teamId] = acc[task.teamId] || [];
    acc[task.teamId].push(task);
    return acc;
  }, {} as Record<number, Task[]>);

  // Calculate team progress
  const teamProgress = Object.entries(tasksByTeam).map(([teamId, teamTasks]) => {
    const completed = teamTasks.filter(task => task.status === 'completed').length;
    const total = teamTasks.length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    return { teamId: parseInt(teamId), progress };
  });

  // Analyze recent activities for trends
  const activityMentions = activities.reduce((acc, activity) => {
    const words = activity.description.toLowerCase().split(' ');
    words.forEach(word => {
      if (word.length > 3) { // Ignore short words
        acc[word] = (acc[word] || 0) + 1;
      }
    });
    return acc;
  }, {} as Record<string, number>);

  const topMentions = Object.entries(activityMentions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Generate insights
  const insights: Insight[] = [];

  // Task progress insights
  if (completionRate < 50 && totalTasks > 10) {
    insights.push({
      type: 'warning',
      content: `Project completion rate is low (${completionRate.toFixed(0)}%)`,
      confidence: 85
    });
  } else if (completionRate > 75) {
    insights.push({
      type: 'success',
      content: `Project is progressing well (${completionRate.toFixed(0)}% complete)`,
      confidence: 90
    });
  }

  // Team progress insights
  teamProgress.forEach(team => {
    if (team.progress < 40) {
      insights.push({
        type: 'warning',
        content: `Team ${team.teamId} is falling behind (${team.progress.toFixed(0)}% complete)`,
        confidence: 80
      });
    } else if (team.progress > 85) {
      insights.push({
        type: 'success',
        content: `Team ${team.teamId} is ahead of schedule (${team.progress.toFixed(0)}% complete)`,
        confidence: 85
      });
    }
  });

  // Activity trends insights
  if (topMentions.length > 0) {
    insights.push({
      type: 'info',
      content: `Frequent discussion topic: "${topMentions[0][0]}" (mentioned ${topMentions[0][1]} times)`,
      confidence: 75
    });
  }

  // Document insights
  if (documents.length > 0) {
    const recentDocument = documents.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
    
    insights.push({
      type: 'info',
      content: `Most recently updated document: "${recentDocument.title}"`,
      confidence: 95
    });
  }

  // Generate project summary
  const summary = `The ${project.name} project is ${project.progress}% complete with ${activeTasks.length} active tasks. 
    ${totalTasks > 0 ? `${completedTasks.length} out of ${totalTasks} tasks have been completed.` : ''} 
    ${documents.length > 0 ? `There are ${documents.length} documents associated with this project.` : ''}`;

  // Determine project status
  let status = "On Track";
  if (project.progress < 30 && insights.filter(i => i.type === 'warning').length > 2) {
    status = "At Risk";
  } else if (insights.filter(i => i.type === 'warning').length > 3) {
    status = "Issues Detected";
  } else if (project.progress > 80 && insights.filter(i => i.type === 'success').length > 2) {
    status = "Ahead of Schedule";
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (status === "At Risk" || status === "Issues Detected") {
    recommendations.push("Schedule a team meeting to address blockers");
    recommendations.push("Re-prioritize tasks to focus on critical path items");
  }
  
  if (insights.some(i => i.content.includes("falling behind"))) {
    recommendations.push("Allocate additional resources to teams falling behind");
  }
  
  if (documents.length === 0) {
    recommendations.push("Create project documentation to improve knowledge sharing");
  }

  return {
    summary,
    insights,
    status,
    recommendations
  };
}

export async function generateInsights(
  project: Project,
  tasks: Task[],
  documents: Document[],
  activities: Activity[]
): Promise<Insight[]> {
  // This is a simplified version that would normally use NLP techniques
  // to analyze project data and generate insights
  
  const analysis = await analyzeProjectData(project, tasks, documents, activities);
  
  // Add some randomization and additional insights for variety
  const additionalInsights: Insight[] = [];
  
  // Task assignment analysis
  const assignedTasks = tasks.filter(task => task.assigneeId !== null);
  const unassignedTasks = tasks.filter(task => task.assigneeId === null);
  
  if (unassignedTasks.length > 3) {
    additionalInsights.push({
      type: 'warning',
      content: `${unassignedTasks.length} tasks are unassigned and need attention`,
      confidence: 90
    });
  }
  
  // Due date analysis
  const overdueTasks = tasks.filter(task => 
    task.status !== 'completed' && 
    task.dueDate && 
    new Date(task.dueDate) < new Date()
  );
  
  if (overdueTasks.length > 0) {
    additionalInsights.push({
      type: 'warning',
      content: `${overdueTasks.length} tasks are overdue`,
      confidence: 95
    });
  }
  
  // Activity frequency
  const recentActivities = activities.filter(
    a => new Date(a.timestamp).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000)
  );
  
  if (recentActivities.length < 5 && project.progress < 90) {
    additionalInsights.push({
      type: 'info',
      content: 'Low activity in the past week, project may need more engagement',
      confidence: 75
    });
  } else if (recentActivities.length > 20) {
    additionalInsights.push({
      type: 'success',
      content: 'High project activity indicates strong team engagement',
      confidence: 80
    });
  }
  
  // Document freshness
  const oldDocuments = documents.filter(
    d => new Date(d.updatedAt).getTime() < Date.now() - (30 * 24 * 60 * 60 * 1000)
  );
  
  if (oldDocuments.length > 0) {
    additionalInsights.push({
      type: 'info',
      content: `${oldDocuments.length} documents haven't been updated in over 30 days`,
      confidence: 70
    });
  }
  
  return [...analysis.insights, ...additionalInsights];
}
