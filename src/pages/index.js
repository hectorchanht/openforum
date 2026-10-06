import React from 'react';
import AddPost from '../components/AddPost';
import Layout from '../components/layout/Layout';
import PostList from '../components/PostList';
import ThreadMeta from '../components/ThreadMeta';


export default function Home() {

  return <Layout>
    <ThreadMeta />
    <AddPost />
    <br />
    <PostList />
  </Layout>
}
