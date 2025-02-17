"use client";

import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/Form";
import { Loading } from "@/components/loading";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";

import { trpc } from "@/lib/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CopyButton } from "@/components/CopyButton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const formSchema = z.object({
  bytes: z.coerce.number().positive(),
  prefix: z.string().max(8).optional(),
  ownerId: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
  expiresEnabled: z.boolean().default(false),
  expires: z
    .string()
    .transform((s) => new Date(s).getTime())
    .optional(),
  rateLimitEnabled: z.boolean().default(false),
  ratelimit: z
    .object({
      type: z.enum(["consistent", "fast"]).default("fast"),
      refillInterval: z.coerce.number().positive(),
      refillRate: z.coerce.number().positive(),
      limit: z.coerce.number().positive(),
    })
    .optional(),
});

type Props = {
  apiId: string;
};

export const CreateKeyButton: React.FC<Props> = ({ apiId }) => {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prefix: "key",
      bytes: 16,
    },
  });
  const router = useRouter();
  const key = trpc.key.create.useMutation({
    onSuccess() {
      toast({
        title: "Key Created",
        description: "Your Key has been created",
      });
      form.reset();
    },
    onError(err) {
      console.error(err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!values.rateLimitEnabled) {
      values.ratelimit = undefined;
    }

    await key.mutateAsync({
      apiId,
      ...values,
      expires: values.expires ?? undefined,
      ownerId: values.ownerId ?? undefined,
    });
  }

  const snippet = `curl -XPOST 'https://api.unkey.dev/v1/keys/verify' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "key": "${key.data?.key}"
  }'
  `;

  return (
    <>
      <Sheet
        onOpenChange={(v) => {
          if (!v) {
            // Remove the key from memory when closing the modal
            key.reset();
            form.reset();
            router.refresh();
          }
        }}
      >
        <SheetTrigger asChild>
          <Button>Create Key</Button>
        </SheetTrigger>

        {key.data ? (
          <SheetContent size="full">
            <SheetHeader>
              <SheetTitle>Your API Key</SheetTitle>
              <SheetDescription>
                This key is only shown once and can not be recovered. Please store it somewhere
                safe.
              </SheetDescription>

              <div className="flex items-center justify-between gap-4 px-2 py-1 mt-4 border rounded lg:p-4 border-white/10 bg-zinc-100 dark:bg-zinc-900">
                <pre className="font-mono">{key.data.key}</pre>
                <CopyButton value={key.data.key} />
              </div>
            </SheetHeader>

            <p className="mt-2 text-sm font-medium text-center text-zinc-700 ">Try verifying it:</p>
            <div className="flex items-start justify-between gap-4 px-2 py-1 border rounded lg:p-4 border-white/10 bg-zinc-100 dark:bg-zinc-900">
              <pre className="font-mono">{snippet}</pre>
              <CopyButton value={snippet} />
            </div>
          </SheetContent>
        ) : (
          <SheetContent size="full">
            <SheetTitle>Create a new Key</SheetTitle>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <ScrollArea className="flex flex-col max-h-[80vh] space-y-4 pr-4">
                  <FormField
                    control={form.control}
                    name="prefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prefix</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          Using a prefix can make it easier for your users to distinguish between apis
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bytes"
                    rules={{ required: true }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bytes</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>How many bytes to use.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ownerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          This is the id of the user or workspace in your system, so you can
                          identify users from an API key.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-around my-4 space-x-4">
                    <FormField
                      control={form.control}
                      name="expiresEnabled"
                      render={({ field }) => {
                        return (
                          <FormItem>
                            <FormControl>
                              <div className="flex items-center space-x-4">
                                <Switch
                                  checked={field.value}
                                  defaultValue={"false"}
                                  onCheckedChange={(value) => {
                                    if (value === false) {
                                      form.resetField("expires");
                                      form.clearErrors("expires");
                                    }
                                    field.onChange(value);
                                  }}
                                />
                                <FormLabel>Enable Expiration</FormLabel>
                              </div>
                            </FormControl>
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="rateLimitEnabled"
                      render={({ field }) => {
                        return (
                          <FormItem>
                            <FormControl>
                              <div className="flex items-center space-x-4">
                                <Switch
                                  checked={field.value}
                                  defaultValue={"false"}
                                  onCheckedChange={(value) => {
                                    if (value === false) {
                                      form.resetField("ratelimit");
                                      form.clearErrors("ratelimit");
                                    }
                                    field.onChange(value);
                                  }}
                                />
                                <FormLabel>Enable Ratelimiting</FormLabel>
                              </div>
                            </FormControl>
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                  {form.watch("expiresEnabled") && (
                    <FormField
                      control={form.control}
                      name="expires"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormDescription>
                            This api key will automatically be revoked after the given date.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {form.watch("rateLimitEnabled") && (
                    <>
                      <FormField
                        control={form.control}
                        name="ratelimit.limit"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel>Limit</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormDescription>
                              The maximum number of requests possible during a burst.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center gap-4 mt-8">
                        <FormField
                          control={form.control}
                          name="ratelimit.refillRate"
                          render={({ field }) => (
                            <FormItem className="w-full">
                              <FormLabel>Refill Rate</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>

                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="ratelimit.refillInterval"
                          render={({ field }) => (
                            <FormItem className="w-full">
                              <FormLabel>Refill Interval (milliseconds)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>

                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormDescription>
                        How many requests may be performed in a given interval
                      </FormDescription>
                    </>
                  )}
                  <Accordion type="multiple" className="w-full">
                    <AccordionItem disabled value="item-3">
                      <AccordionTrigger dir="">Add Policies (soon)</AccordionTrigger>
                      <AccordionContent>TODO: andreas</AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <ScrollBar />
                </ScrollArea>
                <SheetFooter className="justify-end mt-8">
                  <Button disabled={!form.formState.isValid} type="submit">
                    {key.isLoading ? <Loading /> : "Create"}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </SheetContent>
        )}
      </Sheet>
    </>
  );
};
