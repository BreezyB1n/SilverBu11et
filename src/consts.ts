export const SITE = {
  name: 'SilverBu11et',
  author: 'B1n_',
  motto: '而我开始少说多做',
  description: 'B1n_ 的营地：技术文章与个人感悟。',
  github: 'https://github.com/BreezyB1n',
  lang: 'zh-CN',
};

export const KINDS = ['感悟', '技术'] as const;
export type Kind = (typeof KINDS)[number];
