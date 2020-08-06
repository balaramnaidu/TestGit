    MedService.getProducts = async (context) => {
        const result = await MedRepo.getProducts(context);
        if (result) {
          return dbHelpers.parseProducts(result[0]);
        } else {
          return [];
        }
    };
