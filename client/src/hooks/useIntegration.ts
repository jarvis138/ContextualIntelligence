import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  syncIntegration
} from "@/lib/api";
import { Integration } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function useIntegrations(userId: number) {
  return useQuery({
    queryKey: ["/api/users", userId, "integrations"],
    queryFn: () => getUserIntegrations(userId),
  });
}

export function useCreateIntegration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (integration: Omit<Integration, "id">) => createIntegration(integration),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", variables.userId, "integrations"] });
      toast({
        title: "Integration created",
        description: `Successfully connected to ${data.name}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create integration",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Integration> }) => updateIntegration(id, data),
    onSuccess: (data, variables) => {
      // We need to refetch all integrations since we don't have the userId here
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Integration updated",
        description: `${data.name} integration has been updated`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update integration",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => deleteIntegration(id),
    onSuccess: (_, id) => {
      // We need to refetch all integrations since we don't have the userId here
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Integration deleted",
        description: "The integration has been removed",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete integration",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSyncIntegration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => syncIntegration(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Integration synced",
        description: `Successfully synced data from ${data.source || "external source"}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to sync integration",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
