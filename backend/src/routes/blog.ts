import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import {decode, sign, verify} from 'hono/jwt';
import z from "zod"
import {createBlogInput, updateBlogInput} from "@100xdevs/medium-common"

const signupInput =z.object({
 email: z.string().email(),
 password: z.string().min(6),
 name: z.string().optional()
})

export const blogRouter = new Hono<{
    Bindings: {
      DATABASE_URL: string;
      JWT_SECRET: string;
    },
    Variables : {
        userId: string;
    }
  }>()


  //preventing a ts error at c.env.DATABASE_URL and c.env.JWT_SECRET
  blogRouter.use('/api/v1/blog/*', async (c, next)=> {
    //this middleware is used for only blog pages
   try  {
     const header = c.req.header("authorization") || "";
    //Bearer token =>["Bearer", "token"]
    const token = header.split(" ")[1];
    const user = await verify(token, c.env.JWT_SECRET)
    if(user){
        c.set("userId", user.id)
      await next()
    }else {
      c.status(403)
      return c.json({error : "unauthorized"})
    }
    }catch(e){
        c.status(403)
        return c.json({error : "unauthorized"})
    }
  })
  

blogRouter.post('/', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate())
    
      const body = await c.req.json();
      const {success} = createBlogInput.safeParse(body);
      if(!success){
          c.status(411);
      return c.json({
          message: "Inputs not correct"
      })    }
      const authorId = c.get("userId")
      const post = await prisma.post.create({
          data: {
            title: body.title,
            content: body.content,
            authorId: Number(authorId)
          }
      })
    return c.json({
        id: post.id
    })
  })
  
  blogRouter.put('/', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate())
    
      const body = await c.req.json();
      const {success} = updateBlogInput.safeParse(body);
      if(!success){
          c.status(411);
      return c.json({
          message: "Inputs not correct"
      })    }
      const post = await prisma.post.update({
        where: {
            id: body.id
        },
        data:{
            title: body.title,
            content: body.content,
        }
      })
    return c.json({
        id: post.id
    })
  })
  
  blogRouter.get('/:id', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate())
    
      const id =  c.req.param("id");
      try {
        const post = await prisma.post.findFirst({
          where: {
            id: parseInt(id)
          }
      })
    return c.json({
        post
    });
   }catch(e){
          c.status(411);
        return c.json({
            message: "Error while fetching blog post"
        });
   }
  })
  
  //below shows all the posts list or their names
  blogRouter.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate())
      const posts = await prisma.post.findMany();
    return c.json({
        posts
    })
  })