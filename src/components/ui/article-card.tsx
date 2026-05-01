'use client';

import * as React from 'react';

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ArticleCardProps {
  title: string;
  excerpt: string;
  category: string;
  date: string;
  author: string;
  slug: string;
  image?: string;
  readMoreLabel?: string;
  className?: string;
  renderLink?: (props: { href: string; children: React.ReactNode; className?: string }) => React.ReactNode;
  renderImage?: (props: { src: string; alt: string; className?: string }) => React.ReactNode;
  dateIcon?: React.ReactNode;
  authorIcon?: React.ReactNode;
  arrowIcon?: React.ReactNode;
}

function ArticleCard({
  title,
  excerpt,
  category,
  date,
  author,
  slug,
  image,
  readMoreLabel = 'Read more',
  className,
  renderLink,
  dateIcon,
  authorIcon,
  arrowIcon,
}: ArticleCardProps) {
  const href = `/blog/${slug}`;

  const LinkWrapper = renderLink
    ? (props: { href: string; children: React.ReactNode; className?: string }) => renderLink(props)
    : (props: { href: string; children: React.ReactNode; className?: string }) => (
        <a href={props.href} className={props.className}>{props.children}</a>
      );


  return (
    <Card
      className={cn(
        'border-border bg-card/50 pt-4 hover:border-foreground/30 flex flex-col overflow-hidden transition-all hover:shadow-lg px-3.5',
        className
      )}
    >
      {image && (
        <div className="relative h-48 w-full rounded-sm overflow-hidden">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      )}
      <CardHeader className='px-0'>
        <div className="mb-2 flex items-center justify-between">
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary hover:bg-primary/20"
          >
            {category}
          </Badge>
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            {dateIcon}
            {date}
          </div>
        </div>
        <CardTitle className="line-clamp-2 text-lg leading-tight font-semibold">
          <LinkWrapper href={href} className="hover:text-primary transition-colors">
            {title}
          </LinkWrapper>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 px-0">
        <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
          {excerpt}
        </p>
      </CardContent>
      <CardFooter className="border-border border-t px-0 pb-4">
        <div className="flex w-full items-center justify-between">
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            {authorIcon}
            {author}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/80 p-0 hover:bg-transparent"
            asChild
          >
            <LinkWrapper href={href}>
              {readMoreLabel} {arrowIcon}
            </LinkWrapper>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export { ArticleCard };
