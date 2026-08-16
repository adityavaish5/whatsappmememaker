const fs = require('fs/promises');
const path = require('path');
const cheerio = require('cheerio');

const requestedMemes = [
  "Le Nikaal Photu",
  "Welcome Laughing Scene",
  "Isne Poori Duniya Ko Hairaan Kar Diya Hai",
  "Hume Inhe Rokna Hoga Tokna Hoga",
  "Laparwahi Badhti Hi Chali Jaa Rahi Hai",
  "Ye Ek Janam Ke Hain",
  "Zinda Pakadna Hai Bhosdiwale Ko",
  "Tu Hai Tereko Pata Nahi Hai Lekin Tu Hai",
  "Galat Aadmi Se Panga Le Liya",
  "Tum Chupa Na Sakoge Main Wo Raaz Hoon",
  "Ved Yajurved Mukh Shrimukh Blank",
  "Guess Karo Hum Kahan Hain",
  "Saas To Len De Bey",
  "Operation Successful",
  "Ek Kahani Hai Jo Sabko Sunani Hai",
  "Marne Se Main Kabhi Darta Nahi",
  "Waiting With Aarti",
  "Lagta Hai Kachha Khiladi Hai",
  "Humko Maro Humko Zinda Mat Chhodo Saalo",
  "Disappear Kar Diye",
  "Jitta Mil Raha Hai Utne Me Khush Raho",
  "Shabash Kachra Shabash",
  "Mujhe Maaf Karna Om Sai Ram",
  "Karwali Bezzati",
  "Kajol SRK Train Scene",
  "Ye Saala Top Karne Ki Aadat Ho Gayeli Hai Apun Ko",
  "Bahubali Taking Arrows",
  "Ye Toh Tatti Hai",
  "Virus Writing With Both Hands",
  "Dhanda Karo To Bada Karo Purushottam Bhai",
  "Chamgadar Ko Ulta Latkaane Se Morr Nahi Banta",
  "Aise Cheating Hogi To Main Nahi Khelunga",
  "Itni Khushi Mujhe Aaj Tak Nahi Hui",
  "Haath Jod Kar Guzarish Hai Aapse Dur Rahiye Mere Bete Se",
  "Proud Of Dhoni",
  "Bada Pachtaoge",
  "Saanse Jaye Atak Atak",
  "Lekin Permission Humara Lagega",
  "Jethalal Carrying Cylinder",
  "Mujhe Kyu Toda",
  "Warning Do Chutiye Ko",
  "Bhai Ne Bola Karne Ka Matlab Karne Ka",
  "Come On Baby Kick It Kick It",
  "Coconut Water Sharing",
  "Saif Ali Khan Thumbs Up",
  "Hum First Hum First",
  "Gunda Boys Bad Elements Of Society",
  "Shocked Jethalal",
  "Iski Guarantee Mai Nahi De Sakta",
  "Gareebo Dekho Aise Dikhte Hai Ameer Log",
  "Jaa Raha Hu Lekin Wapas Jarur Aaunga",
  "Meri Rooh Ka Parinda Phadphadaye",
  "Hiding Behind Door",
  "Iske Liye Aapko Meri Maa Se Baat Karni Padegi",
  "Well Bro Who The You The Are Is The",
  "Sab Janna Hai Is Bhadwe Ko",
  "Nahi",
  "Gopal Looking From Above",
  "SRK Wakes Up Suddenly",
  "Tum Sath Ho Ya Na Ho Kya Fark Hai",
  "Mai Ghar Todne Jaa Raha Hun",
  "Chota Don With Gang",
  "Paise Barbaad Bhenchod",
  "Bahut Tej Ho Gaye Ho",
  "Ek Cheez Bolke Char Gina Raha Hai",
  "Hera Pheri Attacking Scene",
  "Bas Kijiye Bohot Hogaya",
  "Ye Shareef Shaney Ki Kundli Chahiye Mereko Immediately",
  "Ee Wala Ek Tho Aur Hai Ka",
  "Mirzapur Slap Scene",
  "Inko Kya Hi Pata Chalega (Abhishek Upmanyu)",
  "Sala Gajab Kharab Vyawastha Hai (Panchayat)",
  "Gajab Beizzati Hai Yaar (Panchayat)",
  "Tera Kaam Ho Gaya Tu Ja (Welcome)",
  "Kaafi Faila Hua Business Hai (Welcome)",
  "Meri Aankhon Me To Dekh (Mujhse Shaadi Karogi)",
  "Aae Band Kar (TMKOC)",
  "Listening To Song (TMKOC)",
  "Ye Koi Tarika Hai Bheek Mangne Ka? (Golmaal)",
  "Monisha Beta (Sarabhai vs Sarabhai)",
  "Smelling Letter (DDLJ)",
  "Principal Malhotra On Call (Kuch Kuch Hota Hai)",
  "Aye Tum Log Bhi Chalo Na Mere Sath (Welcome)",
  "Sorry Jaan Pehchan Ke Liye Humare Paas Waqt Hai Hai (Nayak)",
  "Tera Baap Yaha Chodh Kar Gaya Tha Ki Teri Maa (Welcome)",
  "Cheerful vs Afraid (Chup Chup Ke)",
  "SRK Moves Towards Deepika (Chennai Express)",
  "Iska Answer To Nai Ata Mujhe (Abhishek Upmanyu)",
  "Aur Bhai Aa Gaya Swaad (Abhishek Upmanyu)",
  "Angry Anjali (Kabhi Khushi Kabhie Gham)",
  "ABP News' Modi Speech Coverage",
  "Angad Sitting On His Tail",
  "Sabse Pehle Isko Samapt Karenge",
  "Cuddling Baby (TMKOC)",
  "Hiding Face Under Cooking Pots",
  "Ye To Kuch Bhi Nahi Hai",
  "Ghodo Ki Race Me Ab Gadhe Bhi Daudenge",
  "Chota Aadmi Gundai Karna Chahta Hai Karne Do",
  "Iske Pet Par Vaan Maariye Prabhu (Ramayana)",
  "Laxman Looking At Ram (Ramayana)",
  "Aaj Mere Dukh Nirasha Ki Koi Seema Nahi Hai (Ramayana)",
  "Permanent Hoon Sir (3 Idiots)",
  "SRK Giving Money (Swades)",
  "Forgetful Sanjay Singhania (Ghajini)",
  "Jali Na Teri Jali Na (Mujhse Shaadi Karogi)",
  "Pata Nahi Aise Situations Me Main Automatically Agey Kaise Aa Jata Hu (Dhamaal)",
  "Sadak Se Utha Kar Star Banaunga (Welcome)",
  "Arey Chup Ho Jao Papiyon (Deewane Huye Paagal)",
  "Hum Koi Mandir Ka Ghanta Hai Jo Koi Bhi Baja Jata Hai (Hungama)",
  "Coffin Guys' Dance",
  "Koi Sense Hai Is Baat Ki (Bassi Standup)",
  "Main Nahi Bataunga (Golmaal 3)",
  "SRK Looking At Sunny Deol Juhi Chawla (Darr)",
  "Haan Ye Karlo Pehle (Raju Srivastav)",
  "Man Singing",
  "Choti Baatein Pakadne Lag Gaya Tu Chotu",
  "Akshay Kumar Stopping Himself (Housefull 3)",
  "Modi Pose In Parliament",
  "Maine Fir Usko Chaata Laga Diya (Roadies)",
  "Mai Tumhare Baap Ka Naukar Nahi Hu (Karan Arjun)",
  "Ye Kahan Dark Ye To Jindagi Hai (Biswa Comicstaan)",
  "Udta Teer Lena",
  "Zomato Happy Delivery Guy",
  "Tumhare Tarah 40 Log Aur Hai (Sooryavanshi)",
  "Akkha Public Ko Maalum Kaun Ane Wala Hai (Sooryavanshi)",
  "Tu Helicopter Se Latak Kar Kyu Ata Hai (Sooryavanshi)",
  "Arey Aao (Welcome)",
  "Sabse Pehle Mai Hi To Aya Tha (Welcome)",
  "Modi Trump Melania Spinning Wheel",
  "Rula Diya Na Bechari Ko (Baghban)",
  "Us Masoom Ko Is Baat Ki Zara Si Bhi Bhanak Na Thi (Crime Patrol)",
  "Control Uday Control (Welcome)",
  "Alag Kism Ka Nasha Hai (Criminal Justice)",
  "Oof Stones",
  "Kunal Kamra vs Arnab Goswami",
  "Tum Mujhe Tang Karne Lage Ho",
  "Aana To Puri Tarah Ya To Aana Hi Mat",
  "Maine Aapko Jawab De Diya Hai",
  "Hum Iss Ladke Ko Jante Hai (MS Dhoni)",
  "Virat Kohli Appealing Cricket",
  "Ananya Pandey Maine Bahut Struggle Kiya Hai",
  "Main Yahaan Wahaan Bhi Gayi",
  "Modi Looking At Solar Eclipse",
  "Amit Shah Aap Chronology Samajh Lijiye",
  "Sab Kuch Shanti Purvak Tareeke Se Hoga",
  "Amit Shah & Modi Sitting",
  "KL Rahul Celebration",
  "Venkaiah Naidu Smiling As Rajya Sabha Speaker",
  "Bhanu Pratap Singh In Disguise",
  "Yes To All",
  "Rohit Sharma Takes Virat Kohli's Catch",
  "Nana Patekar Leave It (Welcome)",
  "Oye Wapas Rakh Use (Kabir Singh)",
  "Ye Kaunsi Meeting Hai Jahan Mujhe Nahi Bulate (Abhishek Upmanyu)",
  "Salman Khan Dabangg 3 Breathing Fire",
  "Jyaada Ho Raha Hai (Biswa Kalyan Rath)",
  "Chutiya Hai Ye Important Nahi Humara Ladka (Mirzapur)",
  "Sweety Laughing While Dying (Mirzapur)",
  "Rajpal Yadav Eating (De Dana Dan)",
  "You Are Against Our Culture (One Mic Stand - Taapsee Pannu)",
  "Amrish Puri Beautiful",
  "Rishabh Pant Looking For The Ball",
  "Man Looking For Slippers",
  "Maarenge Bhi Hum Aur Bachaenge Bhi Hum (Dabangg 3)",
  "Tumhe To Fansi Hogi Fansi (CID)",
  "Kisiko Pata Nahi Chalega",
  "3 Idiots Interview Scene",
  "Modi With Trash",
  "Mukesh Ambani Mai Aapko Seriously Leta Nahi Hu",
  "Ved Yajurved Jolly LLB",
  "Falling Rohit Sharma",
  "Pooja Hegde Housefull 4",
  "Ronaldo Referee Bitch Please Moment",
  "Humko Join Karlo (Mirzapur)",
  "ACHHA BAAT NAHI HAI YE",
  "Hum Bhi Pele Gaye The Tum Bhi Pele Jaoge (Mirzapur)",
  "Kuch To Sharam Karo Janab",
  "Aate Hi Kaam Shuru Kar Diye (Mirzapur)",
  "Ek Sangathan Ki Shuruwaat Karni Hoga",
  "Hey Prabhu Ye Kaunsa Astra Hai (Ramayana)",
  "Sentilenese Tribe",
  "Mai Nahi Aa Rahi Tere Paas",
  "Aur Kitna Beizzat Karwaoge Beta",
  "Mar Jaayega Tu",
  "Humare Mann Me Tumhare Liye Ijjat Aur Badh Gayi (Mirzapur)",
  "Apna Time Ayega",
  "Bhosdike (Mirzapur)",
  "Jinke Khud Ke Sapne Pure Nahi Hote Wo Dusro Ke Karte Hai",
  "Uri Josh High Sir",
  "To Bhosdike Iske Liye Humare Darwaze Pe Chale Aye (Mirzapur)",
  "Mujhe Ghar Jana Hai",
  "Wo Stree Hai Kuch Bhi Kar Sakti Hai",
  "Arey Abhi Theek Karte Deta Hu",
  "Hosh Uda Deta Hai Mera",
  "Modi Ye PUBG Wala Hai Kya",
  "Samajh Nahi Aya Par Sunke Achha Laga",
  "Kuch Nahi Badla Yaar",
  "Jo Bhi Tum Mujhe Bataoge Wohi Mere Liye Sach Hoga",
  "Chal Jhootha",
  "Wo 10000 Hai Aur Hum 21",
  "Yaad Dilaun Kya",
  "Oye Ye To Mera Wala Gaana Hai",
  "Buddhi Bahut Tez Hai Tumhari (Mirzapur)",
  "Cool Shashi Tharoor",
  "Aise Hi Sexy Lag Raha Tha",
  "Tu To Hasna Bhool Gaya Mere Bachhe",
  "Ab To Aadat Si Hai Mujhko Aise Jeene Me",
  "Din Tera Tha Saal Mera Hoga",
  "Aisa Lagta Hai Kuch Karaya Nahi Par Karaya Hai",
  "Tere Andar Ka Lava Fattke Bhaar Aande",
  "Dukaan Jama Raha Tha Aap Log Ake Berozgaar Kar Diye",
  "Itne Bhari Gyaan Ki Zaroorat Nahi Hai",
  "Aata Hai Jata Hai Fir Wapas Aa Jata Hai",
  "Ye Raaz Bhi Usi Ke Sath Chala Gaya",
  "Main Ek Din Aaunga",
  "Akshay Kumar Finger Swap Ajnabee",
  "Biswa Ye Phatega",
  "Kabhi Aisa Kyun Hota Hai Ki Apne Paraye Ho Jate Hai",
  "Modi Cloud Radar Idea",
  "14 Year Old Nibbi Cat",
  "Itna Galat Kaise Ho Sakte Hai Bhai (Super 30)",
  "Arey Kab Tak Teri Galtiyon Ka Tokra Apne Sar Par Ghoomata Rahunga",
  "Jab Samay Ayega To Sabse Bada Chalang Hum Hi Marenge (Super 30)",
  "Pratibha Diye Hai Par Saadhan Nahi Diye (Super 30)",
  "Aisa Star Banayenge Ki Duniya Dekhega (Super 30)",
  "Let Me Handle It",
  "Bolne De Takleef Hua Hai Bechare Ko",
  "Falling From Stairs Indian TV Serial",
  "Surprised Kohli & Pandya",
  "3 Idiots Hum Dukhi The",
  "Hindustani Bhau Nikal Lavde",
  "Pitaji Ka Karte Hai",
  "Jaisa Chal Raha Hai Waisa Chalne De",
  "Mirzapur Hum Karte Hai Prabandh Aap Chinta Mat Kariye",
  "TMKOC Kya Tapleek Hai Aapko",
  "Chahal Chilling At The Boundary",
  "Super 30 Hrithik Roshan Transformation",
  "Angry Kabir Singh On A Bike",
  "These People Proved That",
  "Lo Chali Main",
  "Abe Gaand Na Phulao Maa Chod Denge Tumhari (Mirzapur)",
  "Salman Katrina Pointing In Opposite Directions",
  "Modi Bear Grylls Laughing",
  "Warner Showing Empty Pockets",
  "Mujhe Ab Tak Nahi Pata Kaise Karenge Par Karenge Karna Hi Hoga",
  "Itna Mazaa Kyu Aa Raha Hai",
  "Saala Saanp Ko Paal Raha Tha",
  "Uninterested Akshay",
  "Content Sahi Hota Hai Par Visual Bohot Disturbing",
  "Kya Ye Hai Aapka Equality",
  "Sunne Ki Shamta Rakhiye",
  "Hum Jaan De Denge Iske Liye (Amit Shah)",
  "Touched & Fell"
];

function slugify(text) {
  return text.toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function downloadImage(url, dest) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!response.ok) throw new Error(`Failed HTTP ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(dest, Buffer.from(arrayBuffer));
}

async function main() {
  console.log('Fetching main page HTML...');
  const res = await fetch('https://curiositycurve.blogspot.com/p/indian-meme-templates.html');
  const html = await res.text();
  const $ = cheerio.load(html);

  // Map all image links found on page
  const pageItems = [];
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    const imgAlt = $(el).find('img').attr('alt')?.trim();
    
    if (href && href.match(/\.(jpeg|jpg|png|webp|gif)/i)) {
      pageItems.push({
        title: text || imgAlt || '',
        imgUrl: href
      });
    }
  });

  console.log(`Found ${pageItems.length} total images on website.`);

  let successCount = 0;

  for (let i = 0; i < requestedMemes.length; i++) {
    const memeName = requestedMemes[i];
    const slug = slugify(memeName);
    if (!slug) continue;

    const dir = path.join(process.cwd(), 'public', 'templates', slug);
    const configPath = path.join(dir, 'config.json');
    const imagePath = path.join(dir, 'image.jpg');

    // Skip if already downloaded and configured
    if (await fs.stat(configPath).then(() => true).catch(() => false)) {
      successCount++;
      continue;
    }

    // Try to find matching image URL on page
    const cleanReqName = memeName.toLowerCase().replace(/\(.*?\)/g, '').trim();
    const match = pageItems.find(item => {
      const itemTitle = item.title.toLowerCase();
      return itemTitle.includes(cleanReqName) || cleanReqName.includes(itemTitle);
    });

    let imageUrl = match ? match.imgUrl : null;

    // Create directory
    await fs.mkdir(dir, { recursive: true });

    let imageDownloaded = false;
    if (imageUrl) {
      try {
        await downloadImage(imageUrl, imagePath);
        imageDownloaded = true;
      } catch (e) {
        console.error(`Failed downloading ${imageUrl} for ${slug}:`, e.message);
      }
    }

    // Create config.json
    const config = {
      "id": slug,
      "name": memeName,
      "visual_description": `Indian meme template: ${memeName}`,
      "usage_context": `Use when expressing the sentiment or reaction of '${memeName}'`,
      "keywords": ["indian meme", ...memeName.toLowerCase().split(' ').filter(w => w.length > 2)],
      "sentiment": "neutral",
      "image_width": 800,
      "image_height": 600,
      "example": {
        "text": memeName
      },
      "text_areas": [
        {
          "id": "text",
          "description": "Main caption or reaction text for this meme",
          "x": 50,
          "y": 50,
          "width": 700,
          "height": 180,
          "fontSize": 44,
          "color": "white",
          "stroke": "black",
          "uppercase": true,
          "textAlign": "center",
          "fontFamily": "Impact"
        }
      ]
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // If image couldn't be downloaded, create a placeholder dummy canvas or leave note
    if (!imageDownloaded) {
      console.log(`[${i + 1}/${requestedMemes.length}] Config created for ${slug} (Image pending/placeholder)`);
    } else {
      console.log(`[${i + 1}/${requestedMemes.length}] ✅ Successfully created ${slug}`);
    }

    successCount++;
  }

  console.log(`\nImport completed! ${successCount}/${requestedMemes.length} templates configured.`);
}

main().catch(console.error);
