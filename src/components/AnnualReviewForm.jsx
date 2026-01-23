import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropzone } from "@/components/file-dropzone";
import { asString, fileToBase64, postToFlow } from "@/services/api";
import { toast } from "sonner";

export function AnnualReviewForm({ onSuccess }) {
  const [arData, setArData] = React.useState({
    impulseId: "",
    dob: "",
    reviewDate: "",
    recommendation: "",
    attachments: [],
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [submitMessage, setSubmitMessage] = React.useState("");

  const isValid =
    arData.impulseId.trim().length > 0 &&
    arData.dob.trim().length > 0 &&
    arData.reviewDate.trim().length > 0 &&
    arData.recommendation.trim().length > 0 &&
    (arData.attachments?.length ?? 0) > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return toast.error("Please complete fields and attach files.");
    
    setSubmitting(true);
    setSubmitMessage("");
    try {
      const attachments = await Promise.all(
        (arData.attachments || []).map(async (f) => ({
          name: f.name,
          contentType: f.type || "application/octet-stream",
          contentBase64: await fileToBase64(f),
        })),
      );

      await postToFlow({
        type: "ANNUAL_REVIEW",
        impulseId: asString(arData.impulseId),
        dob: asString(arData.dob),
        reviewDate: asString(arData.reviewDate),
        recommendation: asString(arData.recommendation),
        attachments,
      });

      toast.success("Annual Review submitted.");
      setArData({ impulseId: "", dob: "", reviewDate: "", recommendation: "", attachments: [] });
      onSuccess();
    } catch (err) {
      setSubmitMessage(err.message);
      toast.error("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual Review Submission</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2"><Label>Impulse ID</Label><Input required value={arData.impulseId} onChange={(e) => setArData((p) => ({ ...p, impulseId: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" required value={arData.dob} onChange={(e) => setArData((p) => ({ ...p, dob: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Date of Annual Review</Label><Input type="date" required value={arData.reviewDate} onChange={(e) => setArData((p) => ({ ...p, reviewDate: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Recommendation</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required value={arData.recommendation} onChange={(e) => setArData((p) => ({ ...p, recommendation: e.target.value }))}>
                <option value="">Select…</option>
                <option value="No Change">No Change</option>
                <option value="Notice of Amendment">Notice of Amendment</option>
                <option value="Proposal to Cease">Proposal to Cease</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Attachments</Label>
            <FileDropzone value={arData.attachments} onChange={(files) => setArData((p) => ({ ...p, attachments: files }))} hint="Drag & drop annual review files here" />
          </div>
          {submitMessage && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{submitMessage}</AlertDescription></Alert>}
          <Button type="submit" disabled={submitting || !isValid} className="min-w-56">{submitting ? "Submitting…" : "Submit Annual Review"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}