-- MySQL dump 10.13  Distrib 8.0.36, for Win64 (x86_64)
--
-- Host: localhost    Database: bazario
-- ------------------------------------------------------
-- Server version	8.0.37

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `user_badge`
--

DROP TABLE IF EXISTS `user_badge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_badge` (
  `id_user` int NOT NULL,
  `id_badge` int NOT NULL,
  `assigned_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_user`,`id_badge`),
  KEY `id_badge` (`id_badge`),
  CONSTRAINT `user_badge_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE,
  CONSTRAINT `user_badge_ibfk_2` FOREIGN KEY (`id_badge`) REFERENCES `badge` (`id_badge`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_badge`
--

LOCK TABLES `user_badge` WRITE;
/*!40000 ALTER TABLE `user_badge` DISABLE KEYS */;
INSERT INTO `user_badge` VALUES (1,1,'2025-03-14 14:32:32'),(1,2,'2025-03-14 14:32:32'),(2,3,'2025-03-14 14:32:32'),(3,1,'2025-03-14 14:32:32'),(3,4,'2025-03-14 14:32:32'),(28,1,'2025-03-21 12:11:39'),(28,2,'2025-03-21 12:11:42'),(28,3,'2025-03-21 12:11:44'),(28,4,'2025-03-21 12:11:45'),(28,5,'2025-03-21 12:11:46'),(28,6,'2025-03-21 12:11:47'),(28,7,'2025-03-21 12:11:48'),(28,8,'2025-03-21 12:11:49');
/*!40000 ALTER TABLE `user_badge` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-03-21 18:36:04
