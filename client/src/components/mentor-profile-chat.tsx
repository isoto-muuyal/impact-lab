import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Send, Check } from "lucide-react";
import type { MentorProfileDraft, MentorProfileChatMessage } from "@shared/schema";

type ChecklistItem = { section: 1 | 2 | 3; step: number; label: string; done: boolean };

export type MentorRoleRequestPreview = {
  draftId: string;
  justification: string;
  attachments: { name: string; type: string; size: number; url: string; storageKey: string }[];
};

interface MentorProfileChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSection1Complete: (preview: MentorRoleRequestPreview) => void;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) return fallback;
  const normalized = error.message.replace(/^\d+:\s*/, "").trim();
  if (!normalized) return fallback;
  try {
    const parsed = JSON.parse(normalized);
    if (parsed && typeof parsed.message === "string") return parsed.message;
  } catch {
    return normalized;
  }
  return normalized;
}

export function MentorProfileChat({ open, onOpenChange, onSection1Complete }: MentorProfileChatProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messageInput, setMessageInput] = useState("");
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<{ draft: MentorProfileDraft; messages: MentorProfileChatMessage[] }>({
    queryKey: ["/api/mentor-profile-draft"],
    enabled: open,
  });

  const draft = data?.draft;
  const messages = data?.messages ?? [];
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, checklist]);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", `/api/mentor-profile-draft/${draft!.id}/messages`, { message });
      return res.json();
    },
    onSuccess: async (result) => {
      setChecklist(result.checklist);
      setMessageInput("");
      await queryClient.invalidateQueries({ queryKey: ["/api/mentor-profile-draft"] });
    },
    onError: (error) => {
      toast({
        title: t("mentorProfiling.errorGeneric", "Error"),
        description: getApiErrorMessage(error, t("mentorProfiling.errorGeneric", "Something went wrong")),
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    const message = messageInput.trim();
    if (!message || !draft) return;
    sendMessageMutation.mutate(message);
  };

  const handleUploadCv = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !draft) return;

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (ext !== ".pdf" && ext !== ".txt") {
      toast({
        title: t("mentorProfiling.unsupportedFileType", "Unsupported file type"),
        description: t("mentorProfiling.uploadCvHint", "Only PDF and TXT files are supported."),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploadingCv(true);
      const response = await fetch(`/api/uploads/mentor-profile-cv?draftId=${draft.id}`, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
          "X-File-Size": String(file.size),
        },
        body: file,
        credentials: "include",
      });

      if (!response.ok) {
        const text = (await response.text()) || response.statusText;
        throw new Error(`${response.status}: ${text}`);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/mentor-profile-draft"] });
      toast({ title: t("mentorProfiling.uploadCv", "CV uploaded") });
    } catch (error) {
      toast({
        title: t("mentorProfiling.errorGeneric", "Error"),
        description: getApiErrorMessage(error, t("mentorProfiling.errorGeneric", "Something went wrong")),
        variant: "destructive",
      });
    } finally {
      setIsUploadingCv(false);
    }
  };

  const handleContinue = async () => {
    if (!draft) return;
    try {
      setIsPreparing(true);
      const res = await apiRequest("GET", `/api/mentor-profile-draft/${draft.id}/role-request-preview`);
      const preview = await res.json();
      onSection1Complete({ draftId: draft.id, ...preview });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t("mentorProfiling.errorGeneric", "Error"),
        description: getApiErrorMessage(error, t("mentorProfiling.errorGeneric", "Something went wrong")),
        variant: "destructive",
      });
    } finally {
      setIsPreparing(false);
    }
  };

  const section1Complete = draft?.status === "section1_complete";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("mentorProfiling.title", "Strategic profiling chat")}</DialogTitle>
          <DialogDescription>{t("mentorProfiling.subtitle", "Chat with the ImpactLab agent and upload your CV to build your MicroImpactLab profile.")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {checklist.filter((item) => item.section === 1).map((item) => (
              <Badge key={item.step} variant={item.done ? "default" : "outline"} className="gap-1">
                {item.done ? <Check className="h-3 w-3" /> : null}
                {item.label}
              </Badge>
            ))}
          </div>

          <ScrollArea className="h-80 rounded-md border p-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t("mentorProfiling.loading", "Loading...")}</p>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-md p-3 text-sm whitespace-pre-wrap ${
                      message.role === "user" ? "ml-8 bg-primary/10" : "mr-8 bg-muted"
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".pdf,.txt"
              disabled={isUploadingCv || !draft}
              onChange={(event) => {
                void handleUploadCv(event.target.files);
              }}
              className="max-w-[220px]"
            />
            {draft?.cvFileName ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                {draft.cvFileName}
              </span>
            ) : null}
          </div>

          <div className="flex items-end gap-2">
            <Textarea
              rows={2}
              value={messageInput}
              placeholder={t("mentorProfiling.messagePlaceholder", "Write your answer...")}
              onChange={(event) => setMessageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              disabled={!draft || sendMessageMutation.isPending}
            />
            <Button
              type="button"
              size="icon"
              onClick={handleSend}
              disabled={!draft || !messageInput.trim() || sendMessageMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          {section1Complete ? (
            <Button type="button" onClick={handleContinue} disabled={isPreparing}>
              {isPreparing ? t("mentorProfiling.submitting", "Preparing...") : t("mentorProfiling.continueToRoleRequest", "Continue to role request")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
